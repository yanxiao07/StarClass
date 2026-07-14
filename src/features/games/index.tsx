import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { homeworkApi } from '../../services/homework';
import { submissionApi } from '../../services/submission';
import { apiClient } from '../../services/client';
import Icon from '../../components/Icon';

// 从AI响应中提取文本（兼容多种返回格式）
const extractAIResponse = (data: any): string => {
  if (!data) return '';
  if (typeof data === 'string') return data;
  if (typeof data === 'object') {
    return data.response || data.answer || data.content || data.message || data.text || '';
  }
  return '';
};

const Games: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPendingHomework, setHasPendingHomework] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [unlockedGames, setUnlockedGames] = useState<string[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const activeElement = document.activeElement;
        if (activeElement?.classList.contains('btn-primary')) {
          (activeElement as HTMLButtonElement).click();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const checkPendingHomework = async () => {
    if (!user || user.role !== 'student') {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [homeworks, submissions] = await Promise.all([
        homeworkApi.getHomeworks(),
        submissionApi.getSubmissions()
      ]);

      let pending = 0;
      homeworks.forEach((hw) => {
        const hasSubmitted = submissions.some((s) => s.homeworkId === hw.id);
        if (!hasSubmitted) {
          pending++;
        }
      });

      setPendingCount(pending);
      setHasPendingHomework(pending > 0);
    } catch (err) {
      console.error('检查作业状态失败:', err);
      setHasPendingHomework(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkPendingHomework();
  }, [user]);

  useEffect(() => {
    const saved = localStorage.getItem('unlockedGames');
    if (saved) {
      setUnlockedGames(JSON.parse(saved));
    }
  }, []);

  const games = [
    {
      id: 'memory',
      name: '记忆翻牌',
      icon: '🃏',
      description: '锻炼你的记忆力，找到所有配对的卡片',
      unlockCost: 20
    },
    {
      id: 'snake',
      name: '贪吃蛇',
      icon: '🐍',
      description: '经典的贪吃蛇游戏，看看你能得多少分',
      unlockCost: 30
    },
    {
      id: '2048',
      name: '2048',
      icon: '🎯',
      description: '数字合并游戏，挑战你的思维能力',
      unlockCost: 50
    },
    {
      id: 'tic-tac-toe',
      name: '井字棋',
      icon: '⭕',
      description: '经典的井字棋游戏，与AI对战',
      unlockCost: 40
    }
  ];

  const unlockGame = async (gameId: string, cost: number) => {
    if (!user || user.stars === undefined || user.stars < cost) {
      alert('星星不足！');
      return;
    }

    if (!confirm(`确定要花费 ${cost} 星星解锁这个游戏吗？`)) {
      return;
    }

    try {
      setLoading(true);
      await apiClient.put('/api/user/profile', { stars: user.stars - cost });

      const newUnlocked = [...unlockedGames, gameId];
      setUnlockedGames(newUnlocked);
      localStorage.setItem('unlockedGames', JSON.stringify(newUnlocked));

      await refreshUser();
      alert('解锁成功！');
    } catch (err: any) {
      console.error('解锁失败:', err);
      alert('解锁失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  if (!user.classId) {
    return (
      <div className="games-page">
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '64px', marginBottom: '1rem' }}>🎮</div>
          <h2 style={{ marginBottom: '1rem', color: '#0f172a' }}>游戏中心</h2>
          <p style={{ marginBottom: '2rem', color: '#64748b', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
            请先加入班级并完成作业，然后才能玩游戏！
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="games-page">
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '64px', marginBottom: '1rem' }}>⏳</div>
          <h2 style={{ marginBottom: '1rem', color: '#0f172a' }}>检查作业状态中...</h2>
        </div>
      </div>
    );
  }

  if (hasPendingHomework && user.role === 'student') {
    return (
      <div className="games-page">
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '64px', marginBottom: '1rem' }}>📚</div>
          <h2 style={{ marginBottom: '1rem', color: '#0f172a' }}>先完成作业！</h2>
          <p style={{ marginBottom: '2rem', color: '#64748b', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
            你还有 {pendingCount} 个作业没有提交。完成所有作业后才能玩游戏！
          </p>
          <button
            className="btn btn-primary"
            onClick={() => window.location.href = '/homework'}
          >
            去完成作业
          </button>
        </div>
      </div>
    );
  }

  if (activeGame) {
    return (
      <div className="games-page">
        {activeGame === 'memory' && <MemoryGame onBack={() => setActiveGame(null)} />}
        {activeGame === 'snake' && <SnakeGame onBack={() => setActiveGame(null)} />}
        {activeGame === '2048' && <Game2048 onBack={() => setActiveGame(null)} />}
        {activeGame === 'tic-tac-toe' && <TicTacToeGame onBack={() => setActiveGame(null)} />}
      </div>
    );
  }

  return (
    <div className="games-page">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">🎮 游戏中心</h2>
        </div>
        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
          完成所有作业后，来这里放松一下吧！用星星解锁更多游戏！
        </p>
        <div className="grid grid-2">
          {games.map((game) => {
            const isUnlocked = unlockedGames.includes(game.id);
            return (
              <div
                key={game.id}
                className="game-card card"
                onClick={() => isUnlocked && setActiveGame(game.id)}
                style={{
                  cursor: isUnlocked ? 'pointer' : 'not-allowed',
                  transition: 'transform 0.2s',
                  opacity: isUnlocked ? 1 : 0.6
                }}
              >
                <div style={{ fontSize: '48px', marginBottom: '1rem' }}>{game.icon}</div>
                <h3 style={{ marginBottom: '0.5rem', color: '#0f172a' }}>{game.name}</h3>
                <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{game.description}</p>
                {!isUnlocked && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      unlockGame(game.id, game.unlockCost);
                    }}
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                  >
                    解锁 ({game.unlockCost} ⭐)
                  </button>
                )}
                {isUnlocked && (
                  <div style={{ color: '#10b981', fontWeight: 'bold' }}>
                    ✅ 已解锁 - 点击开始游戏
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface GameProps {
  onBack: () => void;
}

const MemoryGame: React.FC<GameProps> = ({ onBack }) => {
  const [cards, setCards] = useState<string[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  // AI出题：卡片词语，默认使用学科词语，可由AI生成
  const [words, setWords] = useState<string[]>(['数学', '语文', '英语', '物理', '化学', '历史', '地理', '生物']);

  const initGame = useCallback(() => {
    const gameCards = [...words, ...words]
      .sort(() => Math.random() - 0.5);
    setCards(gameCards);
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setWon(false);
  }, [words]);

  // 开始时调用AI生成学习相关词语配对，失败则使用默认词语库
  useEffect(() => {
    const fetchWords = async () => {
      try {
        const data = await apiClient.post<any>('/api/agents/orchestrator/solve', {
          message: '请生成8个学习相关的词语配对，用于记忆翻牌游戏，返回JSON数组格式如["词语1","词语2",...]'
        });
        const text = extractAIResponse(data);
        // 尝试从返回文本中解析JSON数组
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (Array.isArray(parsed) && parsed.length >= 8) {
            setWords(parsed.slice(0, 8).map((s: any) => String(s)));
          }
        }
      } catch {
        // API失败时静默降级，使用默认词语库
      }
    };
    fetchWords();
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const handleCardClick = (index: number) => {
    if (flipped.length === 2 || flipped.includes(index) || matched.includes(index)) {
      return;
    }

    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      if (cards[newFlipped[0]] === cards[newFlipped[1]]) {
        setMatched(m => [...m, ...newFlipped]);
        setFlipped([]);
        if (matched.length + 2 === cards.length) {
          setWon(true);
        }
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <button className="btn" onClick={onBack} style={{ marginRight: '1rem' }}>← 返回</button>
          <span style={{ fontWeight: 500 }}>🃏 记忆翻牌</span>
        </div>
        <div>
          <span style={{ marginRight: '1rem' }}>步数: {moves}</span>
          <button className="btn" onClick={initGame}>重新开始</button>
        </div>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '0.75rem',
        maxWidth: '400px',
        margin: '0 auto'
      }}>
        {cards.map((emoji, index) => (
          <div
            key={index}
            onClick={() => handleCardClick(index)}
            style={{
              aspectRatio: '1',
              background: matched.includes(index) ? '#10b981' : flipped.includes(index) ? '#2563eb' : '#f1f5f9',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            {(flipped.includes(index) || matched.includes(index)) ? emoji : '?'}
          </div>
        ))}
      </div>
      {won && (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🎉</div>
          <h3>恭喜你赢了！</h3>
          <p style={{ color: '#64748b', marginBottom: '1rem' }}>你用了 {moves} 步完成</p>
        </div>
      )}
    </div>
  );
};

const SnakeGame: React.FC<GameProps> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const gameStateRef = useRef({
    snake: [{ x: 10, y: 10 }],
    velocity: { x: 1, y: 0 },
    food: { x: 15, y: 15 },
    gridSize: 20,
    tileCount: 20
  });
  const animationRef = useRef<any>(null);
  // AI解说：每得30分调用一次AI生成鼓励语
  const [aiCommentary, setAiCommentary] = useState('');
  const lastMilestoneRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const state = gameStateRef.current;

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    state.snake.forEach(segment => {
      ctx.fillStyle = '#10b981';
      ctx.fillRect(segment.x * state.gridSize, segment.y * state.gridSize, state.gridSize - 2, state.gridSize - 2);
    });

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(state.food.x * state.gridSize, state.food.y * state.gridSize, state.gridSize - 2, state.gridSize - 2);
  }, []);

  const gameLoop = useCallback(() => {
    if (gameOver || !gameStarted) return;

    const state = gameStateRef.current;
    const head = { x: state.snake[0].x + state.velocity.x, y: state.snake[0].y + state.velocity.y };

    if (head.x < 0 || head.x >= state.tileCount || head.y < 0 || head.y >= state.tileCount) {
      setGameOver(true);
      setGameStarted(false);
      return;
    }

    if (state.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
      setGameOver(true);
      setGameStarted(false);
      return;
    }

    state.snake.unshift(head);

    if (head.x === state.food.x && head.y === state.food.y) {
      setScore(s => s + 10);
      state.food = {
        x: Math.floor(Math.random() * state.tileCount),
        y: Math.floor(Math.random() * state.tileCount)
      };
    } else {
      state.snake.pop();
    }

    draw();
    animationRef.current = setTimeout(gameLoop, 100);
  }, [gameOver, gameStarted, draw]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const state = gameStateRef.current;
      switch (e.key) {
        case 'ArrowUp':
          if (state.velocity.y !== 1) state.velocity = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
          if (state.velocity.y !== -1) state.velocity = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
          if (state.velocity.x !== 1) state.velocity = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
          if (state.velocity.x !== -1) state.velocity = { x: 1, y: 0 };
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  useEffect(() => {
    if (gameStarted && !gameOver) {
      gameLoop();
    }
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [gameStarted, gameOver, gameLoop]);

  useEffect(() => {
    draw();
  }, [draw]);

  // AI解说：每得30分触发一次，调用AI生成鼓励语
  useEffect(() => {
    const milestone = Math.floor(score / 30);
    if (score > 0 && milestone > lastMilestoneRef.current) {
      lastMilestoneRef.current = milestone;
      const currentScore = score;
      const fetchCommentary = async () => {
        try {
          const data = await apiClient.post<any>('/api/agents/orchestrator/solve', {
            message: `我在贪吃蛇游戏得了${currentScore}分，请用一句话鼓励我，15字以内`
          });
          const text = extractAIResponse(data);
          if (text) setAiCommentary(text);
        } catch {
          // API失败时静默不报错
        }
      };
      fetchCommentary();
    }
  }, [score]);

  const startGame = () => {
    gameStateRef.current = {
      snake: [{ x: 10, y: 10 }],
      velocity: { x: 1, y: 0 },
      food: { x: 15, y: 15 },
      gridSize: 20,
      tileCount: 20
    };
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    lastMilestoneRef.current = 0;
    setAiCommentary('');
  };

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <button className="btn" onClick={onBack} style={{ marginRight: '1rem' }}>← 返回</button>
          <span style={{ fontWeight: 500 }}>🐍 贪吃蛇</span>
        </div>
        <div>
          <span style={{ marginRight: '1rem' }}>分数: {score}</span>
          <button className="btn btn-primary" onClick={startGame}>{gameStarted ? '重新开始' : '开始游戏'}</button>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          style={{ border: '2px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}
        />
      </div>
      {/* AI解说面板 */}
      <div style={{
        maxWidth: '400px',
        margin: '1rem auto 0',
        padding: '0.75rem 1rem',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <Icon name="robot" size={18} color="#2563eb" />
        <div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.125rem' }}>AI解说</div>
          <div style={{ fontSize: '0.875rem', color: '#0f172a' }}>{aiCommentary || '开始游戏后，AI会为你加油助威'}</div>
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: '1rem', color: '#64748b' }}>
        使用方向键控制蛇的移动
      </div>
      {gameOver && (
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>💀</div>
          <h3>游戏结束！</h3>
          <p style={{ color: '#64748b' }}>最终分数: {score}</p>
        </div>
      )}
    </div>
  );
};

const Game2048: React.FC<GameProps> = ({ onBack }) => {
  const size = 4;
  const [grid, setGrid] = useState<number[][]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  // AI提示：调用AI给出移动方向建议
  const [aiHint, setAiHint] = useState('');
  const [hintVisible, setHintVisible] = useState(false);
  const lastHintTimeRef = useRef(0);
  const hintTimeoutRef = useRef<any>(null);

  const initGame = () => {
    const newGrid = Array(size).fill(null).map(() => Array(size).fill(0));
    const addRandomTile = (g: number[][]) => {
      const empty: { i: number; j: number }[] = [];
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          if (g[i][j] === 0) {
            empty.push({ i, j });
          }
        }
      }
      if (empty.length > 0) {
        const { i, j } = empty[Math.floor(Math.random() * empty.length)];
        g[i][j] = Math.random() < 0.9 ? 2 : 4;
      }
    };
    addRandomTile(newGrid);
    addRandomTile(newGrid);
    setGrid(newGrid);
    setScore(0);
    setGameOver(false);
  };

  useEffect(() => {
    initGame();
  }, []);

  // AI提示：每5秒可点击一次，浮层显示2秒后消失
  const handleAiHint = async () => {
    const now = Date.now();
    if (now - lastHintTimeRef.current < 5000) return;
    lastHintTimeRef.current = now;
    try {
      const data = await apiClient.post<any>('/api/agents/orchestrator/solve', {
        message: '2048游戏中，当前最佳移动方向通常是什么？请只回答上/下/左/右中的一个方向'
      });
      const text = extractAIResponse(data);
      setAiHint(text || '暂无建议');
    } catch {
      // API失败时静默不报错
      setAiHint('暂无建议');
    }
    setHintVisible(true);
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    hintTimeoutRef.current = setTimeout(() => setHintVisible(false), 2000);
  };

  const slide = (row: number[]) => {
    let arr = row.filter(val => val);
    let missing = size - arr.length;
    let zeros = Array(missing).fill(0);
    arr = zeros.concat(arr);
    return arr;
  };

  const combine = (row: number[]) => {
    for (let i = size - 1; i > 0; i--) {
      if (row[i] === row[i - 1] && row[i] !== 0) {
        row[i] *= 2;
        setScore(s => s + row[i]);
        row[i - 1] = 0;
      }
    }
    return row;
  };

  const moveRight = () => {
    let newGrid = grid.map(row => slide(combine(slide(row))));
    if (JSON.stringify(newGrid) !== JSON.stringify(grid)) {
      const addRandomTile = (g: number[][]) => {
        const empty: { i: number; j: number }[] = [];
        for (let i = 0; i < size; i++) {
          for (let j = 0; j < size; j++) {
            if (g[i][j] === 0) {
              empty.push({ i, j });
            }
          }
        }
        if (empty.length > 0) {
          const { i, j } = empty[Math.floor(Math.random() * empty.length)];
          g[i][j] = Math.random() < 0.9 ? 2 : 4;
        }
      };
      addRandomTile(newGrid);
      setGrid(newGrid);
    }
  };

  const moveLeft = () => {
    let newGrid = grid.map(row => slide(combine(slide(row))).reverse());
    newGrid = newGrid.map(row => row.reverse());
    if (JSON.stringify(newGrid) !== JSON.stringify(grid)) {
      const addRandomTile = (g: number[][]) => {
        const empty: { i: number; j: number }[] = [];
        for (let i = 0; i < size; i++) {
          for (let j = 0; j < size; j++) {
            if (g[i][j] === 0) {
              empty.push({ i, j });
            }
          }
        }
        if (empty.length > 0) {
          const { i, j } = empty[Math.floor(Math.random() * empty.length)];
          g[i][j] = Math.random() < 0.9 ? 2 : 4;
        }
      };
      addRandomTile(newGrid);
      setGrid(newGrid);
    }
  };

  const rotateGrid = (g: number[][]) => {
    let newGrid: number[][] = [];
    for (let i = 0; i < size; i++) {
      newGrid.push([]);
      for (let j = 0; j < size; j++) {
        newGrid[i][j] = g[j][i];
      }
    }
    return newGrid;
  };

  const moveUp = () => {
    let newGrid = rotateGrid(grid);
    newGrid = newGrid.map(row => slide(combine(slide(row))).reverse());
    newGrid = newGrid.map(row => row.reverse());
    newGrid = rotateGrid(newGrid);
    if (JSON.stringify(newGrid) !== JSON.stringify(grid)) {
      const addRandomTile = (g: number[][]) => {
        const empty: { i: number; j: number }[] = [];
        for (let i = 0; i < size; i++) {
          for (let j = 0; j < size; j++) {
            if (g[i][j] === 0) {
              empty.push({ i, j });
            }
          }
        }
        if (empty.length > 0) {
          const { i, j } = empty[Math.floor(Math.random() * empty.length)];
          g[i][j] = Math.random() < 0.9 ? 2 : 4;
        }
      };
      addRandomTile(newGrid);
      setGrid(newGrid);
    }
  };

  const moveDown = () => {
    let newGrid = rotateGrid(grid);
    newGrid = newGrid.map(row => slide(combine(slide(row))));
    newGrid = rotateGrid(newGrid);
    if (JSON.stringify(newGrid) !== JSON.stringify(grid)) {
      const addRandomTile = (g: number[][]) => {
        const empty: { i: number; j: number }[] = [];
        for (let i = 0; i < size; i++) {
          for (let j = 0; j < size; j++) {
            if (g[i][j] === 0) {
              empty.push({ i, j });
            }
          }
        }
        if (empty.length > 0) {
          const { i, j } = empty[Math.floor(Math.random() * empty.length)];
          g[i][j] = Math.random() < 0.9 ? 2 : 4;
        }
      };
      addRandomTile(newGrid);
      setGrid(newGrid);
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameOver) return;
      switch (e.key) {
        case 'ArrowRight':
          moveRight();
          break;
        case 'ArrowLeft':
          moveLeft();
          break;
        case 'ArrowUp':
          moveUp();
          break;
        case 'ArrowDown':
          moveDown();
          break;
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [grid, gameOver]);

  const getTileColor = (val: number) => {
    const colors: Record<number, string> = {
      0: '#f1f5f9',
      2: '#fef3c7',
      4: '#fde68a',
      8: '#fcd34d',
      16: '#fbbf24',
      32: '#f59e0b',
      64: '#d97706',
      128: '#fca5a5',
      256: '#f87171',
      512: '#ef4444',
      1024: '#dc2626',
      2048: '#991b1b'
    };
    return colors[val] || '#f1f5f9';
  };

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <button className="btn" onClick={onBack} style={{ marginRight: '1rem' }}>← 返回</button>
          <span style={{ fontWeight: 500 }}>🎯 2048</span>
        </div>
        <div>
          <span style={{ marginRight: '1rem' }}>分数: {score}</span>
          <button className="btn" onClick={handleAiHint} style={{ marginRight: '0.5rem' }}>
            <Icon name="bulb" size={16} color="#f59e0b" /> AI提示
          </button>
          <button className="btn" onClick={initGame}>重新开始</button>
        </div>
      </div>
      <div style={{ position: 'relative', maxWidth: '400px', margin: '1rem auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          gap: '0.5rem',
          maxWidth: '400px',
          margin: '0 auto',
          padding: '0.5rem',
          background: '#f1f5f9',
          borderRadius: '8px'
        }}>
          {grid.map((row, i) =>
            row.map((val, j) => (
              <div
                key={`${i}-${j}`}
                style={{
                  aspectRatio: '1',
                  background: getTileColor(val),
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: val >= 1000 ? '1.5rem' : val >= 100 ? '1.75rem' : '2rem',
                  fontWeight: 'bold',
                  color: val > 4 ? '#ffffff' : '#1f2937'
                }}
              >
                {val !== 0 ? val : ''}
              </div>
            ))
          )}
        </div>
        {/* AI提示浮层 */}
        {hintVisible && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(15, 23, 42, 0.85)',
            color: '#ffffff',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            pointerEvents: 'none',
            zIndex: 10
          }}>
            <Icon name="bulb" size={18} color="#fbbf24" />
            {aiHint}
          </div>
        )}
      </div>
      <div style={{ textAlign: 'center', color: '#64748b' }}>
        使用方向键移动数字方块
      </div>
    </div>
  );
};

// 井字棋胜负判定（模块级函数，供minimax复用）
const calculateTicTacToeWinner = (squares: (string | null)[]): string | null => {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
  return null;
};

// minimax算法：困难难度AI，保证不输
const minimax = (board: (string | null)[], isMaximizing: boolean): number => {
  const winner = calculateTicTacToeWinner(board);
  if (winner === 'O') return 10;
  if (winner === 'X') return -10;
  if (board.every(s => s !== null)) return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = 'O';
        best = Math.max(best, minimax(board, false));
        board[i] = null;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = 'X';
        best = Math.min(best, minimax(board, true));
        board[i] = null;
      }
    }
    return best;
  }
};

// 获取最佳落子位置（困难难度，minimax）
const getBestMove = (board: (string | null)[]): number => {
  let bestScore = -Infinity;
  let bestMove = -1;
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      board[i] = 'O';
      const score = minimax(board, false);
      board[i] = null;
      if (score > bestScore) {
        bestScore = score;
        bestMove = i;
      }
    }
  }
  return bestMove;
};

const TicTacToeGame: React.FC<GameProps> = ({ onBack }) => {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winner, setWinner] = useState<string | null>(null);
  // 难度分级：简单(随机走法)/普通(当前逻辑)/困难(minimax)
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [gameStarted, setGameStarted] = useState(false);

  const handleClick = (i: number) => {
    if (winner || board[i] || !gameStarted) return;

    const newBoard = [...board];
    newBoard[i] = 'X';
    setBoard(newBoard);

    const newWinner = calculateTicTacToeWinner(newBoard);
    if (newWinner) {
      setWinner(newWinner);
      return;
    }

    if (newBoard.every(square => square !== null)) {
      setWinner('draw');
      return;
    }

    setIsXNext(false);

    setTimeout(() => {
      const aiBoard = [...newBoard];
      const availableMoves = aiBoard.map((square, index) => square === null ? index : null).filter((val): val is number => val !== null);

      if (availableMoves.length > 0) {
        let aiMove: number;
        if (difficulty === 'easy') {
          // 简单难度：随机选空位
          aiMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
        } else if (difficulty === 'hard') {
          // 困难难度：minimax算法，保证不输
          aiMove = getBestMove(aiBoard);
          if (aiMove === -1) aiMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
        } else {
          // 普通难度：保持现有逻辑（随机走法）
          aiMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
        }
        aiBoard[aiMove] = 'O';
        setBoard(aiBoard);

        const aiWinner = calculateTicTacToeWinner(aiBoard);
        if (aiWinner) {
          setWinner(aiWinner);
        } else if (aiBoard.every(square => square !== null)) {
          setWinner('draw');
        } else {
          setIsXNext(true);
        }
      }
    }, 500);
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setWinner(null);
    setGameStarted(false);
  };

  // 选择难度并开始游戏
  const startWithDifficulty = (level: 'easy' | 'normal' | 'hard') => {
    setDifficulty(level);
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setWinner(null);
    setGameStarted(true);
  };

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <button className="btn" onClick={onBack} style={{ marginRight: '1rem' }}>← 返回</button>
          <span style={{ fontWeight: 500 }}>⭕ 井字棋</span>
        </div>
        {gameStarted && <button className="btn" onClick={resetGame}>重新开始</button>}
      </div>
      {/* 难度选择：游戏开始前选择AI难度 */}
      {!gameStarted ? (
        <div style={{
          maxWidth: '400px',
          margin: '1.5rem auto',
          padding: '1.5rem',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Icon name="settings" size={20} color="#2563eb" />
            <h3 style={{ margin: 0, color: '#0f172a' }}>选择难度</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              className="btn"
              onClick={() => startWithDifficulty('easy')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Icon name="info" size={18} color="#0ea5e9" /> 简单
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>AI随机走法</span>
            </button>
            <button
              className="btn"
              onClick={() => startWithDifficulty('normal')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Icon name="compass" size={18} color="#f59e0b" /> 普通
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>基础AI对战</span>
            </button>
            <button
              className="btn"
              onClick={() => startWithDifficulty('hard')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Icon name="trophy" size={18} color="#ef4444" /> 困难
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>minimax 不败AI</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.5rem',
            maxWidth: '300px',
            margin: '1rem auto'
          }}>
            {board.map((square, i) => (
              <button
                key={i}
                onClick={() => handleClick(i)}
                style={{
                  aspectRatio: '1',
                  fontSize: '3rem',
                  fontWeight: 'bold',
                  background: '#f1f5f9',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: square === 'X' ? '#2563eb' : square === 'O' ? '#ef4444' : '#0f172a'
                }}
              >
                {square}
              </button>
            ))}
          </div>
          {winner && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              {winner === 'draw' ? (
                <>
                  <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🤝</div>
                  <h3>平局！</h3>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '48px', marginBottom: '1rem' }}>{winner === 'X' ? '🎉' : '🤖'}</div>
                  <h3>{winner === 'X' ? '你赢了！' : 'AI赢了！'}</h3>
                </>
              )}
            </div>
          )}
          {!winner && (
            <div style={{ textAlign: 'center', marginTop: '1rem', color: '#64748b' }}>
              {isXNext ? '你的回合 (X)' : 'AI思考中...'}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Games;
