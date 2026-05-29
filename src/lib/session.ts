import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "./prisma";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return null;
    
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        name: true, 
        email: true,
        memberships: { select: { role: true } }
      },
    });

    if (!user) return null;

    const role = user.memberships[0]?.role || "STUDENT";
    return { ...user, role };
  } catch {
    return null;
  }
}
