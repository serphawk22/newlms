import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";


async function main() {
  console.log("\n🌱 Starting database seed...\n");

  // Cleanup existing records in reverse dependency order to prevent FK violations
  console.log("🧹 Cleaning up database...");
  await prisma.certificate.deleteMany({});
  await prisma.materialView.deleteMany({});
  await prisma.recordedClass.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.chatMessage.deleteMany({});
  await prisma.chat.deleteMany({});
  await prisma.liveSession.deleteMany({});
  await prisma.plagiarismResult.deleteMany({});
  await prisma.assignmentSubmission.deleteMany({});
  await prisma.assignment.deleteMany({});
  await prisma.dailyBite.deleteMany({});
  await prisma.lesson.deleteMany({});
  await prisma.module.deleteMany({});
  await prisma.enrollment.deleteMany({});
  await prisma.organizationMember.deleteMany({});
  await prisma.course.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.organization.deleteMany({});
  console.log("✅ Database cleaned.\n");

  // 1. Create organization with Ally Tech Services codes
  const org = await prisma.organization.create({
    data: {
      name: "Ally Tech Services",
      slug: "ally-tech-services",
      joinCode: "ALLY2026",
      instructorCode: "INST2026",
      adminCode: "ADMIN2026",
    },
  });
  console.log(`✅ Created organization: ${org.name}`);
  console.log(`   Student Join Code: ${org.joinCode}`);
  console.log(`   Instructor Code: ${org.instructorCode}`);
  console.log(`   Admin Code: ${org.adminCode}\n`);

  // 2. Create Admin user
  const adminPassword = await bcrypt.hash("Admin@2026", 10);
  const admin = await prisma.user.create({
    data: {
      email: "admin@allytech.edu",
      password: adminPassword,
      name: "System Admin",
      status: "ACTIVE",
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
  console.log(`   Email: admin@allytech.edu`);
  console.log(`   Password: Admin@2026`);
  console.log(`   Login Code: ${admin.loginCode}\n`);

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
  console.log("   • Email: admin@allytech.edu");
  console.log("   • Password: Admin@2026");
  console.log("   • URL: http://localhost:3000/admin/login");
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
