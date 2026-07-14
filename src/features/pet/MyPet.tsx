import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { petApi, UserPet, EXP_THRESHOLDS, PET_MODEL_MAP } from '../../services/pets';
import Icon from '../../components/Icon';
import { Pet3D, PetModelType } from '../../components/three/Pet3D';

const MyPet: React.FC = () => {
  const { user } = useAuth();
  const [pets, setPets] = useState<UserPet[]>([]);
  const [activePet, setActivePet] = useState<UserPet | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'info' | 'error'>('info');
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [happy, setHappy] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const myPets = await petApi.getMyPets();
      setPets(myPets);
      const active = myPets.find(p => p.isActive) || myPets[0] || null;
      setActivePet(active);
    } catch (err: any) {
      console.error('加载宠物失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 显示消息
  const showMessage = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  // 喂养
  const handleFeed = async (foodType: 'basic' | 'premium') => {
    if (!activePet) return;
    try {
      setActionLoading(true);
      const res = await petApi.feedPet(activePet.id, foodType);
      setActivePet(res.pet);
      setPets(prev => prev.map(p => p.id === res.pet.id ? res.pet : p));
      if (res.leveledUp) {
        showMessage(`恭喜！${res.pet.name} 升到了 Lv.${res.pet.level}！`, 'success');
        setHappy(true);
        setTimeout(() => setHappy(false), 2000);
      } else {
        showMessage(`${res.pet.name} 吃得很开心！饱腹度 +${foodType === 'premium' ? 30 : 10}`, 'success');
      }
    } catch (err: any) {
      showMessage(err.message || '喂养失败', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 互动（抚摸）
  const handleInteract = async () => {
    if (!activePet) return;
    try {
      setActionLoading(true);
      const res = await petApi.interactPet(activePet.id);
      setActivePet(res.pet);
      setPets(prev => prev.map(p => p.id === res.pet.id ? res.pet : p));
      setHappy(true);
      setTimeout(() => setHappy(false), 1500);
      if (res.leveledUp) {
        showMessage(`恭喜！${res.pet.name} 升到了 Lv.${res.pet.level}！`, 'success');
      } else {
        showMessage(`${res.pet.name} 心情变好了！`, 'success');
      }
    } catch (err: any) {
      showMessage(err.message || '互动失败', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 点击3D宠物
  const handlePetClick = () => {
    handleInteract();
  };

  // 设为展示宠物
  const handleActivate = async (petId: string) => {
    try {
      await petApi.activatePet(petId);
      await loadData();
      showMessage('已设为展示宠物', 'success');
    } catch (err: any) {
      showMessage(err.message || '设置失败', 'error');
    }
  };

  // 重命名
  const handleRename = async () => {
    if (!activePet || !newName.trim()) return;
    try {
      await petApi.renamePet(activePet.id, newName.trim());
      await loadData();
      setRenaming(false);
      setNewName('');
      showMessage('改名成功！', 'success');
    } catch (err: any) {
      showMessage(err.message || '改名失败', 'error');
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="pet-page">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Icon name="loading" size={32} spin />
          <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>加载宠物中...</p>
        </div>
      </div>
    );
  }

  // 没有宠物
  if (pets.length === 0) {
    return (
      <div className="pet-page">
        <div className="page-header">
          <h1 className="page-title">
            <Icon name="agent" size={28} color="var(--primary)" /> 我的宠物
          </h1>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '72px', marginBottom: '1rem' }}>🥚</div>
          <h2 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>你还没有宠物</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
            去商城领养一只专属宠物吧！完成作业可以喂养宠物，宠物会随经验成长升级。
          </p>
          <button className="btn btn-primary" onClick={() => window.location.href = '/store'}>
            <Icon name="store" size={16} /> 去商城领养
          </button>
        </div>
      </div>
    );
  }

  const modelType = activePet?.petType?.modelType
    ? (PET_MODEL_MAP[activePet.petType.modelType] || 'fox')
    : 'fox';

  // 经验进度
  const expThreshold = activePet ? (EXP_THRESHOLDS[activePet.level] || 0) : 0;
  const expPercent = activePet && expThreshold > 0
    ? Math.min(100, (activePet.exp / expThreshold) * 100)
    : 100;

  return (
    <div className="pet-page">
      <div className="page-header">
        <h1 className="page-title">
          <Icon name="agent" size={28} color="var(--primary)" /> 我的宠物
        </h1>
        <p className="page-subtitle">完成作业喂养宠物，陪伴它成长升级</p>
      </div>

      {message && (
        <div className={`card ${messageType === 'error' ? 'error-message' : ''}`} style={{
          padding: '0.75rem 1rem', marginBottom: '1rem',
          background: messageType === 'success' ? '#dcfce7' : messageType === 'error' ? '#fee2e2' : '#dbeafe',
          border: `1px solid ${messageType === 'success' ? '#86efac' : messageType === 'error' ? '#fca5a5' : '#93c5fd'}`,
          color: messageType === 'success' ? '#166534' : messageType === 'error' ? '#991b1b' : '#1e40af',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <Icon name={messageType === 'error' ? 'warning' : 'check'} size={16} />
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem', alignItems: 'start' }}>
        {/* 3D宠物展示区 */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            height: '440px', position: 'relative',
            background: 'linear-gradient(180deg, #e0f2fe 0%, #f0f9ff 50%, #f8fafc 100%)',
            borderRadius: '12px 12px 0 0',
          }}>
            {activePet && (
              <Pet3D
                modelType={modelType as PetModelType}
                level={activePet.level}
                mood={activePet.mood}
                hunger={activePet.hunger}
                size={1.3}
                interactive
                onInteract={handlePetClick}
              />
            )}
            {happy && (
              <div style={{
                position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(255,255,255,0.95)', borderRadius: '20px', padding: '0.5rem 1.2rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '0.9rem', color: '#f59e0b',
                fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem',
              }}>
                <Icon name="spark" size={16} color="#f59e0b" /> 好开心！
              </div>
            )}
          </div>
          {/* 宠物信息条 */}
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  {activePet?.name || '未命名'}
                  <span style={{
                    fontSize: '0.8rem', padding: '2px 8px', borderRadius: '10px',
                    background: 'var(--primary)', color: '#fff', fontWeight: 600,
                  }}>Lv.{activePet?.level || 1}</span>
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {activePet?.petType?.name} · {activePet?.petType?.description}
                </p>
              </div>
              <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem' }} onClick={() => { setRenaming(true); setNewName(activePet?.name || ''); }}>
                <Icon name="edit" size={14} /> 改名
              </button>
            </div>
          </div>
        </div>

        {/* 状态和操作面板 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* 成长进度 */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Icon name="chart" size={18} color="var(--primary)" /> 成长进度
            </h4>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>经验值</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {activePet?.level === 8 ? '已满级' : `${activePet?.exp || 0} / ${expThreshold}`}
                </span>
              </div>
              <div style={{ height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${expPercent}%`,
                  background: 'linear-gradient(90deg, #8b5cf6, #6366f1)',
                  borderRadius: '5px', transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {[1,2,3,4,5,6,7,8].map(lv => (
                <div key={lv} style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 700,
                  background: (activePet?.level || 0) >= lv ? 'var(--primary)' : '#e2e8f0',
                  color: (activePet?.level || 0) >= lv ? '#fff' : '#94a3b8',
                }}>{lv}</div>
              ))}
            </div>
          </div>

          {/* 状态值 */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Icon name="bulb" size={18} color="var(--accent-amber)" /> 当前状态
            </h4>
            <StatusBar label="饱腹度" value={activePet?.hunger || 0} icon="star" color="#f59e0b" />
            <StatusBar label="心情值" value={activePet?.mood || 0} icon="spark" color="#ec4899" />
          </div>

          {/* 操作按钮 */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Icon name="rocket" size={18} color="var(--accent-green)" /> 互动
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                className="btn btn-primary"
                disabled={actionLoading}
                onClick={() => handleFeed('basic')}
                style={{ justifyContent: 'flex-start' }}
              >
                <Icon name="store" size={16} /> 喂普通粮 (+10饱腹 +5经验)
              </button>
              <button
                className="btn btn-primary"
                disabled={actionLoading}
                onClick={() => handleFeed('premium')}
                style={{ justifyContent: 'flex-start', background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
              >
                <Icon name="star" size={16} /> 喂高级粮 (+30饱腹 +15经验)
              </button>
              <button
                className="btn btn-secondary"
                disabled={actionLoading}
                onClick={handleInteract}
              >
                <Icon name="spark" size={16} /> 抚摸 (+10心情 +2经验)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 多宠物切换 */}
      {pets.length > 1 && (
        <div className="card" style={{ marginTop: '1.5rem', padding: '1.25rem' }}>
          <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name="users" size={18} color="var(--primary)" /> 我的宠物列表
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {pets.map(pet => (
              <div
                key={pet.id}
                onClick={() => pet.isActive ? undefined : handleActivate(pet.id)}
                style={{
                  padding: '0.75rem', borderRadius: '8px', cursor: pet.isActive ? 'default' : 'pointer',
                  border: `2px solid ${pet.isActive ? 'var(--primary)' : 'var(--border-color)'}`,
                  background: pet.isActive ? 'rgba(37,99,235,0.05)' : 'var(--bg-card)',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{pet.name}</span>
                  <span style={{
                    fontSize: '0.75rem', padding: '2px 6px', borderRadius: '8px',
                    background: 'var(--primary)', color: '#fff',
                  }}>Lv.{pet.level}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {pet.petType?.name}
                </p>
                {pet.isActive && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Icon name="check" size={12} /> 展示中
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 重命名弹窗 */}
      {renaming && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setRenaming(false)}>
          <div className="card" style={{ padding: '1.5rem', width: '320px' }} onClick={e => e.stopPropagation()}>
            <h4 style={{ marginBottom: '1rem' }}>给宠物起个名字</h4>
            <input
              className="form-input"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="输入新名字"
              maxLength={20}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleRename()}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn btn-primary" onClick={handleRename} disabled={!newName.trim()}>
                <Icon name="check" size={16} /> 确定
              </button>
              <button className="btn btn-secondary" onClick={() => setRenaming(false)}>
                <Icon name="close" size={16} /> 取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 状态条子组件
const StatusBar: React.FC<{ label: string; value: number; icon: string; color: string }> = ({ label, value, icon, color }) => (
  <div style={{ marginBottom: '0.75rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
      <span style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
        <Icon name={icon} size={14} color={color} /> {label}
      </span>
      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{value}/100</span>
    </div>
    <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${value}%`, background: color, borderRadius: '4px',
        transition: 'width 0.5s ease',
      }} />
    </div>
  </div>
);

export default MyPet;
