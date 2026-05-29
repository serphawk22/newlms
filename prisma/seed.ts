import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {

  console.log("\n🌱 Starting database seed...\n");

  // 1. Create organization with all codes
  const org = await prisma.organization.create({
    data: {
      name: "Sri Indu College",
      slug: "sri-indu",
      joinCode: "SRINDU2024",
      instructorCode: "INST2024",
      adminCode: "ADMIN2024",
    },
  });
  console.log(`✅ Created organization: ${org.name}`);
  console.log(`   Student Join Code: ${org.joinCode}`);
  console.log(`   Instructor Code: ${org.instructorCode}`);
  console.log(`   Admin Code: ${org.adminCode}\n`);

  // 2. Create Admin user
  const adminPassword = await bcrypt.hash("Admin@123", 10);
  const admin = await prisma.user.create({
    data: {
      email: "admin@srindu.edu",
      password: adminPassword,
      name: "Admin",
      loginCode: "ADM" + Math.floor(1000 + Math.random() * 9000),
      memberships: {
        create: {
          organizationId: org.id,
          role: "ADMIN",
        },
      },
    },
  });
  console.log(`✅ Created admin user:`);
  console.log(`   Email: admin@srindu.edu`);
  console.log(`   Password: Admin@123`);
  console.log(`   Login Code: ${admin.loginCode}\n`);

  // 3. Create Instructor user
  const instructorPassword = await bcrypt.hash("Instructor@123", 10);
  const instructor = await prisma.user.create({
    data: {
      email: "instructor@srindu.edu",
      password: instructorPassword,
      name: "Test Instructor",
      loginCode: "INS" + Math.floor(1000 + Math.random() * 9000),
      memberships: {
        create: {
          organizationId: org.id,
          role: "INSTRUCTOR",
        },
      },
    },
  });
  console.log(`✅ Created instructor user:`);
  console.log(`   Email: instructor@srindu.edu`);
  console.log(`   Password: Instructor@123`);
  console.log(`   Login Code: ${instructor.loginCode}\n`);

  // 4. Create Student user
  const studentPassword = await bcrypt.hash("Student@123", 10);
  const student = await prisma.user.create({
    data: {
      email: "student@srindu.edu",
      password: studentPassword,
      name: "Test Student",
      loginCode: "STU" + Math.floor(1000 + Math.random() * 9000),
      memberships: {
        create: {
          organizationId: org.id,
          role: "STUDENT",
        },
      },
    },
  });
  console.log(`✅ Created student user:`);
  console.log(`   Email: student@srindu.edu`);
  console.log(`   Password: Student@123`);
  console.log(`   Login Code: ${student.loginCode}\n`);

  // 5. Create sample course
  const course = await prisma.course.create({
    data: {
      title: "Introduction to Computer Science",
      description: "Learn the fundamentals of computer science, including programming, algorithms, and data structures.",
      published: true,
      organizationId: org.id,
      creatorId: instructor.id,
    },
  });
  console.log(`✅ Created course: ${course.title}\n`);

  console.log("✨ Seed completed successfully!\n");
  console.log("📋 Quick Reference:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n🎓 ORGANIZATION");
  console.log(`   Name: ${org.name}`);
  console.log(`   Student Code: ${org.joinCode}`);
  console.log(`   Instructor Code: ${org.instructorCode}`);
  console.log(`   Admin Code: ${org.adminCode}`);
  console.log("\n👤 LOGIN CREDENTIALS");
  console.log("   Admin:");
  console.log("   • Email: admin@srindu.edu");
  console.log("   • Password: Admin@123");
  console.log("   • URL: http://localhost:3000/admin/login");
  console.log("\n   Instructor:");
  console.log("   • Email: instructor@srindu.edu");
  console.log("   • Password: Instructor@123");
  console.log("   • URL: http://localhost:3000/instructor/login");
  console.log("\n   Student:");
  console.log("   • Email: student@srindu.edu");
  console.log("   • Password: Student@123");
  console.log("   • URL: http://localhost:3000/student/login");
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
