import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDatabase() {
  console.log('🧹 开始清空数据库...');

  try {
    await prisma.reward.deleteMany({});
    console.log('✅ 删除了所有奖励记录');

    await prisma.studentStats.deleteMany({});
    console.log('✅ 删除了所有学生统计');

    await prisma.submission.deleteMany({});
    console.log('✅ 删除了所有作业提交');

    await prisma.homework.deleteMany({});
    console.log('✅ 删除了所有作业');

    await prisma.class.deleteMany({});
    console.log('✅ 删除了所有班级');

    await prisma.user.deleteMany({});
    console.log('✅ 删除了所有用户');

    console.log('\n🎉 数据库清空完成！');
  } catch (error) {
    console.error('❌ 清空数据库时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearDatabase();
