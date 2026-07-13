import prisma from '../src/utils/prisma.js';

const seedStore = async () => {
  try {
    console.log('正在添加商城初始数据...');
    
    const storeItems = [
      {
        name: '幸运盲盒',
        description: '打开获得随机数量的星星！可能更少也可能更多哦~',
        type: 'blindBox',
        price: 30,
        isActive: true
      },
      {
        name: '豪华盲盒',
        description: '更高概率获得大量星星！搏一搏，单车变摩托！',
        type: 'blindBox',
        price: 80,
        isActive: true
      },
      {
        name: '至尊盲盒',
        description: '超级大奖等你来拿！有机会获得巨额星星！',
        type: 'blindBox',
        price: 200,
        isActive: true
      }
    ];
    
    const existingItems = await prisma.storeItem.count();
    
    if (existingItems === 0) {
      for (const item of storeItems) {
        await prisma.storeItem.create({
          data: item
        });
      }
      console.log('✅ 商城初始数据已添加！');
    } else {
      console.log('✅ 商城数据已存在，跳过添加');
    }
    
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await prisma.$disconnect();
  }
};

seedStore();