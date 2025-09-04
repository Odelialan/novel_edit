'use client';

import React from 'react';
import CharacterDesignForm from '../../components/CharacterDesignForm';

const CharacterDesignPage: React.FC = () => {
  const handleDesignComplete = (result: any) => {
    console.log('角色设计完成:', result);
    // 这里可以添加成功提示或其他处理逻辑
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            AI角色设计工具
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            基于小说类型、大纲和已创作剧情，智能生成丰满、鲜明、充满戏剧张力的角色人设
          </p>
        </div>
        
        <CharacterDesignForm onDesignComplete={handleDesignComplete} />
        
        <div className="mt-12 max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              使用说明
            </h2>
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="font-medium text-gray-900">1. 填写基本信息</h3>
                <p>输入小说类型、大纲、已创作剧情和角色设计要求等基本信息</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">2. 选择角色类型</h3>
                <p>选择要设计男主角还是女主角，系统会根据选择生成相应的提示词</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">3. 生成角色设计</h3>
                <p>点击设计按钮，系统会自动生成完整的角色设计提示词</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">4. 复制使用</h3>
                <p>将生成的提示词复制到AI工具中使用，获得专业的角色设计结果</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterDesignPage;
