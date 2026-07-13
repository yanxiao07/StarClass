import prisma from '../src/utils/prisma.js';

const seedUsers = async () => {
  try {
    console.log('正在给现有学生用户添加100星星...');
    
    const students = await prisma.user.findMany({
      where: { role: 'student', stars: { lt: 100 } }
    });
    
    for (const student of students) {
      await prisma.user.update({
        where: { id: student.id },
        data: { stars: 100 }
      });
    }
    
    console.log(`✅ 已给 ${students.length} 个学生用户添加了100星星！`);
    
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await prisma.$disconnect();
  }
};

seedUsers();