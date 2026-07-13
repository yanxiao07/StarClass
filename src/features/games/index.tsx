import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../../services/client';
import { submissionApi } from '../../services/submission';

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
        apiClient.get<any[]>('/api/homework'),
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
          <h2 style={{ marginBottom: '1rem', color: '#374151' }}>游戏中心</h2>
          <p style={{ marginBottom: '2rem', color: '#6b7280', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
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
          <h2 style={{ marginBottom: '1rem', color: '#374151' }}>检查作业状态中...</h2>
        </div>
      </div>
    );
  }

  if (hasPendingHomework && user.role === 'student') {
    return (
      <div className="games-page">
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '64px', marginBottom: '1rem' }}>📚</div>
          <h2 style={{ marginBottom: '1rem', color: '#374151' }}>先完成作业！</h2>
          <p style={{ marginBottom: '2rem', color: '#6b7280', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
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
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
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
                <h3 style={{ marginBottom: '0.5rem', color: '#1f2937' }}>{game.name}</h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{game.description}</p>
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

  const emojis = ['🎈', '🎨', '🎭', '🎪', '🎯', '🎲', '🎸', '🎺'];

  const initGame = () => {
    const gameCards = [...emojis, ...emojis]
      .sort(() => Math.random() - 0.5);
    setCards(gameCards);
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setWon(false);
  };

  useEffect(() => {
    initGame();
  }, []);

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
              background: matched.includes(index) ? '#10b981' : flipped.includes(index) ? '#3b82f6' : '#f3f4f6',
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
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>你用了 {moves} 步完成</p>
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

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const state = gameStateRef.current;

    ctx.fillStyle = '#ffffff';
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
          style={{ border: '2px solid #e5e7eb', borderRadius: '8px', background: '#ffffff' }}
        />
      </div>
      <div style={{ textAlign: 'center', marginTop: '1rem', color: '#6b7280' }}>
        使用方向键控制蛇的移动
      </div>
      {gameOver && (
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>💀</div>
          <h3>游戏结束！</h3>
          <p style={{ color: '#6b7280' }}>最终分数: {score}</p>
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
      0: '#f3f4f6',
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
    return colors[val] || '#1f2937';
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
          <button className="btn" onClick={initGame}>重新开始</button>
        </div>
      </div>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: `repeat(${size}, 1fr)`, 
        gap: '0.5rem',
        maxWidth: '400px',
        margin: '1rem auto',
        padding: '0.5rem',
        background: '#f3f4f6',
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
      <div style={{ textAlign: 'center', color: '#6b7280' }}>
        使用方向键移动数字方块
      </div>
    </div>
  );
};

const TicTacToeGame: React.FC<GameProps> = ({ onBack }) => {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winner, setWinner] = useState<string | null>(null);

  const handleClick = (i: number) => {
    if (winner || board[i]) return;
    
    const newBoard = [...board];
    newBoard[i] = 'X';
    setBoard(newBoard);
    
    const calculateWinner = (squares: (string | null)[]) => {
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
    
    const newWinner = calculateWinner(newBoard);
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
        const randomMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
        aiBoard[randomMove] = 'O';
        setBoard(aiBoard);
        
        const aiWinner = calculateWinner(aiBoard);
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
  };

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <button className="btn" onClick={onBack} style={{ marginRight: '1rem' }}>← 返回</button>
          <span style={{ fontWeight: 500 }}>⭕ 井字棋</span>
        </div>
        <button className="btn" onClick={resetGame}>重新开始</button>
      </div>
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
              background: '#f3f4f6',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              color: square === 'X' ? '#3b82f6' : square === 'O' ? '#ef4444' : '#1f2937'
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
        <div style={{ textAlign: 'center', marginTop: '1rem', color: '#6b7280' }}>
          {isXNext ? '你的回合 (X)' : 'AI思考中...'}
        </div>
      )}
    </div>
  );
};

export default Games;
