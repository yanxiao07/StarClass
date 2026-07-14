import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { storeApi } from '../../services/store';
import Icon from '../../components/Icon';

interface StoreItem {
  id: string;
  name: string;
  description: string | null;
  type: string;  // theme / bubble / avatar / pet / pet_food / blindbox
  price: number;
  icon?: string;
  purchased?: boolean;
}

const StarStore: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const showMessage = (msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const itemsData = await storeApi.getStoreItems();
      setItems(itemsData);
    } catch (err: any) {
      showMessage(err.message || '加载数据失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 获取用户已购买的商品id集合
  const getPurchasedIds = (): Set<string> => {
    return new Set(items.filter(i => i.purchased).map(i => i.id));
  };

  const handlePurchase = async (item: StoreItem) => {
    if (!user) return;
    if ((user.stars || 0) < item.price) {
      showMessage('星星不足！', 'error');
      return;
    }
    if (!confirm(`确定花费 ${item.price} 星星购买「${item.name}」吗？`)) return;

    try {
      setActionLoading(true);
      const result = await storeApi.purchaseItem(item.id);

      // 盲盒显示奖励
      if (item.type === 'blindbox' && result.reward) {
        const r = result.reward;
        if (r.type === 'stars') {
          showMessage(`幸运盲盒开出 ${r.amount} 颗星星！`, 'success');
        } else if (r.type === 'exp' && r.petName) {
          showMessage(`幸运盲盒：${r.petName} 获得 ${r.amount} 经验！`, 'success');
        } else if (r.type === 'pet' && r.petName) {
          showMessage(`恭喜！盲盒开出了「${r.petName}」宠物！`, 'success');
        }
      } else if (item.type === 'pet') {
        showMessage(`领养成功！快去宠物页看看「${item.name}」吧`, 'success');
      } else {
        showMessage('购买成功！', 'success');
      }

      await refreshUser();
      await loadData();
    } catch (err: any) {
      showMessage(err.message || '购买失败', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUse = async (item: StoreItem) => {
    if (!user) return;
    try {
      setActionLoading(true);
      await storeApi.useItem(item.id);
      showMessage('使用成功！', 'success');
      await refreshUser();
    } catch (err: any) {
      showMessage(err.message || '使用失败', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 判断商品是否正在使用中
  const isActive = (item: StoreItem): boolean => {
    const u = user as any;
    if (item.type === 'theme') return u?.theme === item.id.replace('theme_', '');
    if (item.type === 'bubble') return u?.chatBubbleStyle === item.id.replace('bubble_', '');
    if (item.type === 'avatar') return u?.activeAvatar === item.id;
    return false;
  };

  // 类型标签
  const getTypeLabel = (type: string): string => {
    const map: Record<string, string> = {
      theme: '主题',
      bubble: '气泡',
      avatar: '头像',
      pet: '宠物',
      pet_food: '宠物粮',
      blindbox: '盲盒',
    };
    return map[type] || type;
  };

  // 类型颜色
  const getTypeColor = (type: string): string => {
    const map: Record<string, string> = {
      theme: '#8b5cf6',
      bubble: '#0ea5e9',
      avatar: '#ec4899',
      pet: '#f59e0b',
      pet_food: '#10b981',
      blindbox: '#ef4444',
    };
    return map[type] || '#64748b';
  };

  // 按类型分组
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, StoreItem[]>);

  const typeOrder = ['pet', 'pet_food', 'blindbox', 'theme', 'bubble', 'avatar'];

  if (!user) return null;

  return (
    <div className="star-store">
      <div className="page-header">
        <h1 className="page-title">
          <Icon name="store" size={28} color="var(--accent-amber)" /> 星星商城
        </h1>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', fontWeight: 700 }}>
          <Icon name="star" size={22} color="#f59e0b" />
          <span style={{ color: '#f59e0b' }}>{user.stars || 0}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 400 }}>颗星星</span>
        </div>
      </div>

      {message && (
        <div style={{
          padding: '0.75rem 1rem', marginBottom: '1rem', borderRadius: '8px',
          background: messageType === 'success' ? '#dcfce7' : '#fee2e2',
          border: `1px solid ${messageType === 'success' ? '#86efac' : '#fca5a5'}`,
          color: messageType === 'success' ? '#166534' : '#991b1b',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <Icon name={messageType === 'error' ? 'warning' : 'check'} size={16} />
          {message}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Icon name="loading" size={28} spin />
          <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>加载商品中...</p>
        </div>
      ) : (
        typeOrder.map(type => {
          const group = groupedItems[type];
          if (!group || group.length === 0) return null;
          return (
            <div key={type} className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
              <h3 style={{
                marginBottom: '1rem', paddingBottom: '0.5rem',
                borderBottom: '2px solid var(--border-color)',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}>
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: getTypeColor(type),
                }} />
                {getTypeLabel(type)}系列
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                  ({group.length})
                </span>
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                {group.map(item => {
                  const purchased = item.purchased || getPurchasedIds().has(item.id);
                  const active = isActive(item);
                  const typeColor = getTypeColor(item.type);

                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '1rem', borderRadius: '10px',
                        border: active ? `2px solid #10b981` : `1px solid var(--border-color)`,
                        background: active ? 'rgba(16,185,129,0.04)' : 'var(--bg-card)',
                        transition: 'all 0.2s',
                        display: 'flex', flexDirection: 'column',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{item.name}</h4>
                        <span style={{
                          fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px',
                          background: typeColor, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap',
                        }}>
                          {getTypeLabel(item.type)}
                        </span>
                      </div>

                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', flex: 1 }}>
                        {item.description || ''}
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 700, color: '#f59e0b' }}>
                          <Icon name="star" size={16} color="#f59e0b" />
                          {item.price}
                        </span>

                        {/* 按钮逻辑 */}
                        {item.type === 'blindbox' ? (
                          <button
                            className="btn btn-primary"
                            disabled={actionLoading}
                            onClick={() => handlePurchase(item)}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                          >
                            <Icon name="spark" size={14} /> 开启
                          </button>
                        ) : item.type === 'pet_food' ? (
                          purchased ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
                              <Icon name="check" size={14} color="#10b981" /> 已拥有
                            </span>
                          ) : (
                            <button
                              className="btn btn-primary"
                              disabled={actionLoading}
                              onClick={() => handlePurchase(item)}
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                            >
                              <Icon name="star" size={14} /> 购买
                            </button>
                          )
                        ) : item.type === 'pet' ? (
                          purchased ? (
                            <button
                              className="btn btn-secondary"
                              onClick={() => window.location.href = '/pet'}
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                            >
                              <Icon name="agent" size={14} /> 去看看
                            </button>
                          ) : (
                            <button
                              className="btn btn-primary"
                              disabled={actionLoading}
                              onClick={() => handlePurchase(item)}
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                            >
                              <Icon name="star" size={14} /> 领养
                            </button>
                          )
                        ) : purchased ? (
                          active ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
                              <Icon name="check" size={14} color="#10b981" /> 使用中
                            </span>
                          ) : (
                            <button
                              className="btn btn-secondary"
                              disabled={actionLoading}
                              onClick={() => handleUse(item)}
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                            >
                              <Icon name="check" size={14} /> 使用
                            </button>
                          )
                        ) : (
                          <button
                            className="btn btn-primary"
                            disabled={actionLoading}
                            onClick={() => handlePurchase(item)}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                          >
                            <Icon name="star" size={14} /> 购买
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default StarStore;
