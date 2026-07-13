import prisma from './src/utils/prisma.js';

async function seed() {
  console.log('开始添加商城商品...');

  const items = [
    {
      id: 'rainbow-bubble',
      name: '彩虹气泡',
      description: '彩色渐变的聊天气泡',
      type: 'chatBubble',
      price: 50
    },
    {
      id: 'ocean-bubble',
      name: '海洋气泡',
      description: '蓝色海洋风格的聊天气泡',
      type: 'chatBubble',
      price: 30
    },
    {
      id: 'gold-bubble',
      name: '金色气泡',
      description: '尊贵的金色聊天气泡',
      type: 'chatBubble',
      price: 150
    },
    {
      id: 'starry-theme',
      name: '星空主题',
      description: '神秘的星空背景主题',
      type: 'theme',
      price: 100
    },
    {
      id: 'sakura-theme',
      name: '樱花主题',
      description: '浪漫的粉色樱花主题',
      type: 'theme',
      price: 80
    },
    {
      id: 'dark-theme',
      name: '暗夜主题',
      description: '炫酷的黑色主题',
      type: 'theme',
      price: 120
    }
  ];

  for (const item of items) {
    try {
      await prisma.storeItem.upsert({
        where: { id: item.id },
        update: item,
        create: item
      });
      console.log(`已添加商品: ${item.name}`);
    } catch (error) {
      console.error(`添加商品失败 ${item.name}:`, error);
    }
  }

  console.log('商城商品添加完成！');
  await prisma.$disconnect();
}

seed().catch(console.error);
