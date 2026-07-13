import React, { useMemo } from 'react';

const StarDecoration: React.FC = () => {
  const stars = useMemo(() => {
    return [
      { id: 1, className: 'star-1', rotation: Math.random() * 360 },
      { id: 2, className: 'star-2', rotation: Math.random() * 360 },
      { id: 3, className: 'star-3', rotation: Math.random() * 360 },
      { id: 4, className: 'star-4', rotation: Math.random() * 360 },
      { id: 5, className: 'star-5', rotation: Math.random() * 360 },
      { id: 6, className: 'star-6', rotation: Math.random() * 360 },
      { id: 7, className: 'star-7', rotation: Math.random() * 360 },
      { id: 8, className: 'star-8', rotation: Math.random() * 360 },
      { id: 9, className: 'star-9', rotation: Math.random() * 360 },
      { id: 10, className: 'star-10', rotation: Math.random() * 360 },
      { id: 11, className: 'star-11', rotation: Math.random() * 360 },
      { id: 12, className: 'star-12', rotation: Math.random() * 360 },
    ];
  }, []);

  return (
    <>
      {stars.map((star) => (
        <div
          key={star.id}
          className={`star-decoration ${star.className}`}
          style={{ transform: `rotate(${star.rotation}deg)` }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2L14.5 9H22L16 13.5L18.5 21L12 16.5L5.5 21L8 13.5L2 9H9.5L12 2Z"
              fill="#FFD700"
              stroke="#FFA500"
              strokeWidth="1"
            />
          </svg>
        </div>
      ))}
    </>
  );
};

export default StarDecoration;
