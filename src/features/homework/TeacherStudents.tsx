import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { classApi } from '../../services/class';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface ClassData {
  id: string;
  name: string;
  classCode: string;
  teacherId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    students: number;
  };
  students?: any[];
}

const getLevelFromStars = (stars: number) => {
  const levels = [
    { level: 0, min: 0, max: 0 },
    { level: 1, min: 1, max: 10 },
    { level: 2, min: 11, max: 30 },
    { level: 3, min: 31, max: 60 },
    { level: 4, min: 61, max: 100 },
    { level: 5, min: 101, max: 150 },
    { level: 6, min: 151, max: Infinity }
  ];
  
  for (let i = levels.length - 1; i >= 0; i--) {
    if (stars >= levels[i].min) {
      return levels[i].level;
    }
  }
  return 0;
};

const TeacherStudents: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState(false);

  const loadClasses = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await classApi.getTeacherClasses();
      setClasses(data);
    } catch (err: any) {
      setError(err.message || '加载班级失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRemoveStudent = async (student: any) => {
    if (!confirm(`确定要将 ${student.name} 移出班级吗？`)) {
      return;
    }
    setRemoving(true);
    try {
      const classId = classes.find((c) => c.students?.some((s: any) => s.id === student.id))?.id;
      if (classId) {
        await classApi.removeStudent(classId, student.id);
        alert('学生已成功移出班级！');
        loadClasses();
        setSelectedStudent(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '移除学生失败');
    } finally {
      setRemoving(false);
    }
  };

  useEffect(() => {
    loadClasses();
    const interval = setInterval(() => {
      loadClasses();
    }, 5000);
    return () => clearInterval(interval);
  }, [loadClasses]);

  const getChartData = (stats: any) => ({
    labels: Object.keys(stats),
    datasets: [
      {
        label: '能力维度',
        data: Object.values(stats),
        backgroundColor: 'rgba(102, 126, 234, 0.2)',
        borderColor: 'rgba(102, 126, 234, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(102, 126, 234, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(102, 126, 234, 1)',
      },
    ],
  });

  const chartOptions = {
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20,
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  if (!user) return null;

  const sortedClasses = [...classes].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  const hasStudents = classes.some((c) => c.students && c.students.length > 0);

  const getSortedStudents = (students: any[]) => {
    return [...students].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  };

  return (
    <div className="students-page">
      {!selectedStudent ? (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">学生管理</h2>
          </div>
          
          {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>加载中...</div>
          ) : !hasStudents ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#718096' }}>
              暂无学生，请先创建班级并邀请学生加入
            </div>
          ) : (
            sortedClasses.map((cls) => {
              const students = cls.students || [];
              if (students.length === 0) return null;
              
              const sortedStudents = getSortedStudents(students).map((s: any) => ({
                ...s,
                className: cls.name,
                level: getLevelFromStars(s.stars || 0),
                totalStars: s.stars || 0,
                submissionCount: s._count?.submissions || 0,
                stats: {
                  '作业完成度': s.studentStats?.homeworkCompletion || 0,
                  '正确率': s.studentStats?.accuracy || 0,
                  '参与度': s.studentStats?.participation || 0,
                  '创新思维': s.studentStats?.creativity || 0,
                  '团队协作': s.studentStats?.teamwork || 0,
                  '进步速度': s.studentStats?.improvement || 0
                }
              }));
              
              return (
                <div key={cls.id} style={{ marginBottom: '2rem' }}>
                  <h3 style={{ 
                    marginBottom: '1rem', 
                    color: '#2d3748',
                    borderBottom: '2px solid #667eea',
                    paddingBottom: '0.5rem'
                  }}>
                    {cls.name} ({sortedStudents.length} 名学生)
                  </h3>
                  <div className="grid grid-3">
                    {sortedStudents.map((student) => (
                      <div
                        key={student.id}
                        className="student-card"
                        onClick={() => setSelectedStudent(student)}
                      >
                        <div className="student-avatar">
                          {student.name.charAt(0)}
                        </div>
                        <h3 className="student-name">{student.name}</h3>
                        <p className="student-id">学号: {student.studentId || '未设置'}</p>
                        <div className="student-level">
                          <span className="badge badge-graded">Lv.{student.level}</span>
                        </div>
                        <div className="student-rewards">
                          <span>⭐ {student.totalStars}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="student-detail">
          <button
            className="btn btn-secondary"
            onClick={() => setSelectedStudent(null)}
            style={{ marginBottom: '2rem' }}
          >
            ← 返回学生列表
          </button>

          <div className="grid grid-2">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">学生信息</h3>
              </div>
              <div className="student-info">
                <div className="info-row">
                  <span className="info-label">姓名</span>
                  <span className="info-value">{selectedStudent.name}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">学号</span>
                  <span className="info-value">{selectedStudent.studentId || '未设置'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">班级</span>
                  <span className="info-value">{selectedStudent.className}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">等级</span>
                  <span className="info-value badge badge-graded">Lv.{selectedStudent.level}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">提交作业次数</span>
                  <span className="info-value">{selectedStudent.submissionCount}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">获得奖励</span>
                  <span className="info-value">
                    ⭐ {selectedStudent.totalStars} 星星
                  </span>
                </div>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <button
                  className="btn btn-danger"
                  onClick={() => handleRemoveStudent(selectedStudent)}
                  disabled={removing}
                  style={{ width: '100%' }}
                >
                  {removing ? '移除中...' : '移出班级'}
                </button>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">能力六芒星图</h3>
              </div>
              <div className="chart-container">
                <Radar data={getChartData(selectedStudent.stats)} options={chartOptions} />
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: '2rem' }}>
            <div className="card-header">
              <h3 className="card-title">能力维度详情</h3>
            </div>
            <div className="grid grid-3">
              {Object.entries(selectedStudent.stats).map(([key, value]) => (
                <div key={key} className="stat-item">
                  <div className="stat-label">{key}</div>
                  <div className="stat-bar">
                    <div
                      className="stat-fill"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                  <div className="stat-value">{value as number}分</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherStudents;
