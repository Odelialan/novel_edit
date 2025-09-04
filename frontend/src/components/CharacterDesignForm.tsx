import React, { useState } from 'react';
import styles from './CharacterDesignForm.module.css';

interface CharacterDesignFormProps {
  onDesignComplete?: (result: any) => void;
}

interface FormData {
  novel_type: string;
  outline: string;
  plot: string;
  character_design: string;
  heroine_profile?: string;
  hero_profile?: string;
}

const CharacterDesignForm: React.FC<CharacterDesignFormProps> = ({ onDesignComplete }) => {
  const [formData, setFormData] = useState<FormData>({
    novel_type: '',
    outline: '',
    plot: '',
    character_design: '',
    heroine_profile: '',
    hero_profile: ''
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [designType, setDesignType] = useState<'hero' | 'heroine'>('hero');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = designType === 'hero' ? '/api/character-design/design-hero' : '/api/character-design/design-heroine';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
      
      if (onDesignComplete) {
        onDesignComplete(data);
      }
    } catch (error) {
      console.error('角色设计失败:', error);
      setResult({ success: false, message: `设计失败: ${error}` });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      novel_type: '',
      outline: '',
      plot: '',
      character_design: '',
      heroine_profile: '',
      hero_profile: ''
    });
    setResult(null);
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>角色设计工具</h2>
      
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${designType === 'hero' ? styles.active : ''}`}
          onClick={() => setDesignType('hero')}
        >
          设计男主角
        </button>
        <button
          className={`${styles.tab} ${designType === 'heroine' ? styles.active : ''}`}
          onClick={() => setDesignType('heroine')}
        >
          设计女主角
        </button>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="novel_type" className={styles.label}>
            小说类型 *
          </label>
          <input
            type="text"
            id="novel_type"
            name="novel_type"
            value={formData.novel_type}
            onChange={handleInputChange}
            className={styles.input}
            placeholder="如：仙侠、都市、历史等"
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="outline" className={styles.label}>
            小说大纲 *
          </label>
          <textarea
            id="outline"
            name="outline"
            value={formData.outline}
            onChange={handleInputChange}
            className={styles.textarea}
            placeholder="请描述小说的主要情节和大纲"
            rows={4}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="plot" className={styles.label}>
            已创作剧情 *
          </label>
          <textarea
            id="plot"
            name="plot"
            value={formData.plot}
            onChange={handleInputChange}
            className={styles.textarea}
            placeholder="请描述已经创作的具体剧情内容"
            rows={4}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="character_design" className={styles.label}>
            已规定的角色设计 *
          </label>
          <textarea
            id="character_design"
            name="character_design"
            value={formData.character_design}
            onChange={handleInputChange}
            className={styles.textarea}
            placeholder="请描述已经设定的角色设计要求"
            rows={4}
            required
          />
        </div>

        {designType === 'hero' && (
          <div className={styles.formGroup}>
            <label htmlFor="heroine_profile" className={styles.label}>
              女主角设定
            </label>
            <textarea
              id="heroine_profile"
              name="heroine_profile"
              value={formData.heroine_profile}
              onChange={handleInputChange}
              className={styles.textarea}
              placeholder="请描述女主角的人设（可选）"
              rows={4}
            />
          </div>
        )}

        <div className={styles.buttonGroup}>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? '设计中...' : `设计${designType === 'hero' ? '男主角' : '女主角'}`}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className={styles.resetButton}
          >
            重置
          </button>
        </div>
      </form>

      {result && (
        <div className={styles.result}>
          <h3 className={styles.resultTitle}>
            {result.success ? '设计成功' : '设计失败'}
          </h3>
          <p className={styles.resultMessage}>{result.message}</p>
          
          {result.success && result.data && (
            <div className={styles.resultData}>
              <h4>生成的提示词：</h4>
              <div className={styles.promptContainer}>
                <pre className={styles.promptText}>{result.data.prompt}</pre>
              </div>
              
              {result.data.style && (
                <div className={styles.styleInfo}>
                  <strong>风格要求：</strong> {result.data.style}
                </div>
              )}
              
              {result.data.schema_hint && (
                <div className={styles.schemaInfo}>
                  <strong>输出格式：</strong> {result.data.schema_hint}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CharacterDesignForm;
