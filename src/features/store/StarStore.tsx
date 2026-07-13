import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { storeApi } from '../../services/store';

interface StoreItem {
  id: string;
  name: string;
  description: string | null;
  type: string;
  price: number;
  imageUrl: string | null;
  isActive: boolean;
}

const StarStore: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [purchases, setPurchases] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const activeElement = document.activeElement;
        if (activeElement?.classList.contains('btn-primary') || activeElement?.classList.contains('btn-secondary')) {
          (activeElement as HTMLButtonElement).click();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [itemsData, purchasesData] = await Promise.all([
        storeApi.getStoreItems(),
        storeApi.getMyPurchases()
      ]);
      
      setItems(itemsData);
      setPurchases(purchasesData.map((p: any) => p.itemId));
    } catch (err: any) {
      setError(err.response?.data?.error || '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePurchase = async (item: StoreItem) => {
    if (!user || user.stars === undefined) {
      alert('请先登录');
      return;
    }

    if (item.type !== 'blindBox' && purchases.includes(item.id)) {
      alert('您已经购买过这个物品了');
      return;
    }

    if (user.stars < item.price) {
      alert('星星不足！');
      return;
    }

    if (!confirm(`确定要花费 ${item.price} 星星购买 ${item.name} 吗？`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      const result = await storeApi.purchaseItem(item.id);
      
      if (item.type === 'blindBox' && result.starsEarned !== undefined) {
        alert(`🎉 恭喜！你获得了 ${result.starsEarned} 颗星星！`);
      } else {
        alert('购买成功！');
      }
      
      await refreshUser();
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || '购买失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUse = async (item: StoreItem) => {
    if (!user) {
      alert('请先登录');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await storeApi.useItem(item.id);
      alert('使用成功！');
      await refreshUser();
    } catch (err: any) {
      setError(err.response?.data?.error || '使用失败');
    } finally {
      setLoading(false);
    }
  };

  const getItemTypeLabel = (type: string) => {
    switch (type) {
      case 'chatBubble':
        return '聊天气泡';
      case 'theme':
        return '主题';
      case 'blindBox':
        return '盲盒';
      default:
        return type;
    }
  };

  if (!user) return null;

  return (
    <div className="star-store">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">星星商城</h2>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
            我的星星: <span style={{ color: '#f59e0b' }}>{user.stars || 0}</span>
          </div>
        </div>

        {error && <div className="error-message" style={{ margin: '1rem' }}>{error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>加载中...</div>
        ) : (
          <div className="grid grid-2" style={{ gap: '1rem', padding: '1rem' }}>
            {items.map((item) => {
              const isPurchased = purchases.includes(item.id);
              const isActive = (item.type === 'theme' && (user as any).theme === item.id) || 
                (item.type === 'chatBubble' && (user as any).chatBubbleStyle === item.id);
              
              return (
                <div
                  key={item.id}
                  className="card"
                  style={{
                    padding: '1rem',
                    border: isActive ? '2px solid #10b981' : isPurchased ? '2px solid #3b82f6' : '1px solid #e2e8f0'
                  }}
                >
                  <div className="card-header" style={{ padding: 0, marginBottom: '0.5rem' }}>
                    <h3 className="card-title" style={{ fontSize: '1.1rem' }}>
                      {item.type === 'blindBox' ? '🎁 ' : ''}{item.name}
                    </h3>
                    <span className="badge badge-pending">
                      {item.price} ⭐
                    </span>
                  </div>

                  {item.description && (
                    <p style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      {item.description}
                    </p>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="badge" style={{ backgroundColor: item.type === 'blindBox' ? '#fbbf24' : '#e2e8f0', color: item.type === 'blindBox' ? '#1f2937' : '#1f2937' }}>
                      {getItemTypeLabel(item.type)}
                    </span>

                    {item.type === 'blindBox' ? (
                      <button
                        onClick={() => handlePurchase(item)}
                        className="btn btn-primary"
                        disabled={loading}
                      >
                        开启
                      </button>
                    ) : isPurchased ? (
                      isActive ? (
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>使用中</span>
                      ) : (
                        <button
                          onClick={() => handleUse(item)}
                          className="btn btn-secondary"
                          disabled={loading}
                        >
                          使用
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => handlePurchase(item)}
                        className="btn btn-primary"
                        disabled={loading}
                      >
                        购买
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StarStore;
