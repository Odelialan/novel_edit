import asyncio
import subprocess
import json
import logging
import os
import signal
from typing import Optional, Dict
from pathlib import Path

from app.config import settings

logger = logging.getLogger(__name__)

class TunnelService:
    def __init__(self):
        self.active_tunnels: Dict[str, subprocess.Popen] = {}
        self.tunnel_info: Dict[str, Dict] = {}
    
    async def start_ngrok(self, port: int = 8000) -> Optional[Dict[str, str]]:
        """启动ngrok隧道"""
        try:
            if not settings.NGROK_AUTHTOKEN:
                raise Exception("NGROK_AUTHTOKEN未配置")
            
            # 停止现有的ngrok进程（如果有）
            await self.stop_ngrok()
            
            # 构建ngrok命令
            cmd = [
                "ngrok",
                "http", 
                str(port),
                "--authtoken", settings.NGROK_AUTHTOKEN,
                "--log", "stdout",
                "--log-format", "json"
            ]
            
            logger.info(f"启动ngrok命令: {' '.join(cmd)}")
            
            # 启动ngrok进程
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
                universal_newlines=True
            )
            
            # 等待ngrok启动并获取公网URL
            public_url = await self._wait_for_ngrok_url(process)
            
            if public_url:
                self.active_tunnels["ngrok"] = process
                self.tunnel_info["ngrok"] = {
                    "provider": "ngrok",
                    "public_url": public_url,
                    "local_port": port,
                    "status": "active",
                    "pid": process.pid
                }
                
                # 更新全局配置
                await self._update_global_config("ngrok", public_url)
                
                logger.info(f"ngrok隧道启动成功: {public_url}")
                return self.tunnel_info["ngrok"]
            else:
                process.terminate()
                raise Exception("获取ngrok公网URL失败")
                
        except FileNotFoundError:
            raise Exception("ngrok未安装或不在PATH中。请安装ngrok: https://ngrok.com/download")
        except Exception as e:
            logger.error(f"启动ngrok失败: {str(e)}")
            raise Exception(f"启动ngrok失败: {str(e)}")
    
    async def stop_ngrok(self) -> bool:
        """停止ngrok隧道"""
        try:
            if "ngrok" in self.active_tunnels:
                process = self.active_tunnels["ngrok"]
                
                # 优雅关闭
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
                
                del self.active_tunnels["ngrok"]
                
            if "ngrok" in self.tunnel_info:
                del self.tunnel_info["ngrok"]
            
            # 更新全局配置
            await self._update_global_config("none", "")
            
            logger.info("ngrok隧道已停止")
            return True
            
        except Exception as e:
            logger.error(f"停止ngrok失败: {str(e)}")
            return False
    
    async def get_tunnel_status(self) -> Dict[str, Dict]:
        """获取隧道状态"""
        # 检查进程是否还在运行
        for provider, process in list(self.active_tunnels.items()):
            if process.poll() is not None:  # 进程已结束
                logger.warning(f"{provider}隧道进程已结束")
                del self.active_tunnels[provider]
                if provider in self.tunnel_info:
                    self.tunnel_info[provider]["status"] = "stopped"
        
        return self.tunnel_info.copy()
    
    async def _wait_for_ngrok_url(self, process: subprocess.Popen, timeout: int = 30) -> Optional[str]:
        """等待ngrok启动并获取公网URL"""
        start_time = asyncio.get_event_loop().time()
        
        while asyncio.get_event_loop().time() - start_time < timeout:
            if process.poll() is not None:  # 进程已结束
                logger.error("ngrok进程意外结束")
                return None
            
            try:
                # 读取stdout输出
                line = process.stdout.readline()
                if line:
                    logger.debug(f"ngrok输出: {line.strip()}")
                    
                    # 尝试解析JSON格式的日志
                    try:
                        log_data = json.loads(line.strip())
                        if log_data.get("msg") == "started tunnel" and "url" in log_data:
                            public_url = log_data["url"]
                            if public_url.startswith("https://"):
                                return public_url
                    except json.JSONDecodeError:
                        # 不是JSON格式，继续尝试其他方式
                        if "started tunnel" in line and "url=" in line:
                            # 尝试提取URL
                            parts = line.split("url=")
                            if len(parts) > 1:
                                url = parts[1].split()[0]
                                if url.startswith("https://"):
                                    return url
                
                await asyncio.sleep(0.1)
                
            except Exception as e:
                logger.error(f"读取ngrok输出失败: {str(e)}")
                await asyncio.sleep(0.5)
        
        # 超时，尝试通过API获取
        try:
            return await self._get_ngrok_url_from_api()
        except:
            return None
    
    async def _get_ngrok_url_from_api(self) -> Optional[str]:
        """通过ngrok API获取公网URL"""
        try:
            import httpx
            
            async with httpx.AsyncClient() as client:
                response = await client.get("http://localhost:4040/api/tunnels")
                if response.status_code == 200:
                    data = response.json()
                    tunnels = data.get("tunnels", [])
                    for tunnel in tunnels:
                        if tunnel.get("proto") == "https":
                            return tunnel.get("public_url")
        except Exception as e:
            logger.error(f"通过API获取ngrok URL失败: {str(e)}")
        
        return None
    
    async def _update_global_config(self, tunnel_type: str, url: str):
        """更新全局配置文件"""
        try:
            config_path = Path(settings.NOVEL_REPO_PATH) / "global_config.json"
            
            config = {}
            if config_path.exists():
                with open(config_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
            
            config.update({
                "tunnel": tunnel_type,
                "tunnel_url": url,
                "updated_at": __import__("datetime").datetime.utcnow().isoformat()
            })
            
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, ensure_ascii=False, indent=2)
                
        except Exception as e:
            logger.error(f"更新全局配置失败: {str(e)}")

# 创建隧道服务实例
tunnel_service = TunnelService() 