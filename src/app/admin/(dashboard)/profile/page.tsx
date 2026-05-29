import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify, type JWTPayload } from "jose";
import { prisma } from "@/lib/prisma";
import { InstructorProfileClient } from "@/components/InstructorProfileClient";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

export default async function AdminProfilePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/login");

  let payload: JWTPayload;
  try {
    const verified = await jwtVerify(token, secret);
    payload = verified.payload;
  } catch {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload!.userId as string },
    include: { memberships: { include: { organization: true } } },
  });

  if (!user || user.memberships.length === 0) redirect("/login");

  const membership = user.memberships[0];
  if (membership.role !== "ADMIN") redirect("/login");

  const org = membership.organization;

  const [courses, totalStudents, instructorReviews] = await Promise.all([
    prisma.course.findMany({
      where: { creatorId: user.id },
      orderBy: { id: "desc" },
      select: { id: true, title: true, published: true },
    }),
    prisma.enrollment.count({
      where: { course: { creatorId: user.id } },
    }),
    prisma.review.findMany({
      where: { course: { creatorId: user.id } },
      include: {
        student: { select: { name: true, email: true } },
        course: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const avgRating =
    instructorReviews.length > 0
      ? Math.round(
          (instructorReviews.reduce((sum, r) => sum + r.rating, 0) /
            instructorReviews.length) *
            10
        ) / 10
      : null;

  return (
    <InstructorProfileClient
      userName={user.name ?? "Admin"}
      userEmail={user.email}
      userAvatarSeed={user.name ?? "Admin"}
      orgName={org.name}
      isAdmin={true}
      courses={courses.map((c) => ({ id: c.id, title: c.title, published: c.published }))}
      totalStudents={totalStudents}
      avgRating={avgRating}
      expertise={user.expertise ?? []}
      reviews={instructorReviews.map((r) => ({
        id: r.id,
        studentName: r.student.name ?? r.student.email,
        studentInitial: (r.student.name ?? r.student.email).charAt(0).toUpperCase(),
        courseTitle: r.course.title,
        rating: r.rating,
        comment: r.comment,
      }))}
    />
  );
}
