"use client";

import { motion, useMotionValue, useTransform, useSpring, useMotionValueEvent, type Variants } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, BookOpen, Clock, Flame, GraduationCap, MapPin,
  Edit, Settings, Trophy, Star,
  Building2, Mail, Camera, Award, Loader,
} from "lucide-react";

interface Achievement {
  name: string; icon: string; color: string; unlocked: boolean;
}

interface ActivityItem {
  id: string; title: string; time: string; type: string;
}

interface CourseItem {
  id: string; title: string; progress: number; completed: boolean;
}

interface ProfileData {
  user: { id: string; name: string; email: string; avatarSeed: string; avatar: string | null; coverImage: string | null };
  org: { id: string; name: string };
  stats: {
    enrollmentCount: number; completedCourses: number; learningHours: number;
    xp: number; level: number; rank: string; streak: number;
  };
  achievements: Achievement[];
  recentActivity: ActivityItem[];
  courses: CourseItem[];
}


function ActivityIcon({ type }: { type: string }) {
  const cls = "w-4 h-4";
  switch (type) {
    case "quiz":       return <Star className={`${cls} text-emerald-600`} />;
    case "assignment": return <BookOpen className={`${cls} text-blue-600`} />;
    case "badge":      return <Award className={`${cls} text-purple-600`} />;
    case "live":       return <GraduationCap className={`${cls} text-red-600`} />;
    case "course":     return <Award className={`${cls} text-amber-600`} />;
    case "login":      return <Flame className={`${cls} text-orange-600`} />;
    default:           return <BookOpen className={`${cls} text-blue-600`} />;
  }
}

function streakMessage(days: number) {
  if (days === 0) return "Start your streak today!";
  if (days < 3)   return "Keep going! You're building momentum.";
  if (days < 7)   return "Great habit forming! Keep it up.";
  if (days < 14)  return "You're on fire! Keep it up.";
  return `${days} days strong — Unstoppable!`;
}

function AnimatedNumber({ value }: { value: number }) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => Math.round(v));
  const spring = useSpring(motionValue, { stiffness: 60, damping: 20 });
  const [display, setDisplay] = useState(0);

  useMotionValueEvent(rounded, "change", (latest) => {
    setDisplay(latest);
  });

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <>{display}</>;
}

const fadeTop: Variants = {
  hidden: { y: -20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { ease: "easeOut", duration: 0.4 } },
};

const fadeBottom: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { ease: "easeOut", duration: 0.4 } },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, ease: "easeOut", duration: 0.4 },
  },
};

const staggerItem: Variants = {
  hidden: { y: 12, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { ease: "easeOut", duration: 0.4 } },
};

export function StudentProfileClient({ profileData, initialOrgName }: {
  profileData: ProfileData;
  initialOrgName: string;
}) {
  const { user, org, stats, achievements, recentActivity } = profileData;
  const [avatar, setAvatar] = useState(user.avatar);
  const [coverImage, setCoverImage] = useState(user.coverImage);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const unlockedAchievements = achievements.filter((a) => a.unlocked);

  async function handleUpload(type: "avatar" | "cover", file: File) {
    const setLoading = type === "avatar" ? setUploadingAvatar : setUploadingCover;
    setLoading(true);
    try {
      const configRes = await fetch("/api/config");
      const config = await configRes.json();
      if (!config.cloudinaryCloudName || !config.cloudinaryUploadPreset) {
        console.error("Missing Cloudinary config");
        return;
      }
      const { uploadToCloudinaryDirect } = await import("@/lib/uploads");
      const result = await uploadToCloudinaryDirect(file, {
        preset: config.cloudinaryUploadPreset,
        cloudName: config.cloudinaryCloudName,
      });
      const saveRes = await fetch("/api/student/profile/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, url: result.secure_url }),
      });
      if (!saveRes.ok) {
        const errData = await saveRes.json().catch(() => ({}));
        throw new Error(errData.error || `Save failed (${saveRes.status})`);
      }
      if (type === "avatar") setAvatar(result.secure_url);
      else setCoverImage(result.secure_url);
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Back link */}
      <motion.div initial="hidden" animate="visible" variants={fadeTop}>
        <Link href="/student">
          <Button variant="ghost" className="text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 px-0">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
        </Link>
      </motion.div>

      {/* Banner + Avatar */}
      <motion.div initial="hidden" animate="visible" variants={fadeTop} className="relative">
        <Card className="border border-zinc-200 shadow-sm bg-white overflow-hidden rounded-xl">
          <div
            className="h-28 w-full bg-cover bg-center relative"
            style={coverImage ? { backgroundImage: `url(${coverImage})` } : {}}
          >
            {!coverImage && <div className="absolute inset-0 bg-gradient-to-r from-zinc-900 to-zinc-800" />}
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              className="absolute top-3 right-3 bg-black/40 text-white p-1.5 rounded-full hover:bg-black/60 transition-colors disabled:opacity-50"
              aria-label="Upload cover image"
            >
              {uploadingCover ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
            </button>
          </div>

          <CardContent className="px-8 pb-8 pt-0 relative">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {/* Avatar */}
              <div className="relative -mt-14 shrink-0">
                <div className="w-24 h-24 sm:w-24 sm:h-24 rounded-full ring-4 ring-white shadow-lg overflow-hidden bg-zinc-100">
                  {avatar ? (
                    <img src={avatar} alt="Student Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <img
                      src={`https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(user.avatarSeed)}&backgroundColor=transparent`}
                      alt="Student Avatar"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 bg-zinc-900 text-white p-2 rounded-full shadow-md border-2 border-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
                  aria-label="Upload avatar"
                >
                  {uploadingAvatar ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 pt-2 sm:pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-zinc-900 truncate">{user.name}</h2>
                  <Badge variant="secondary" className="w-fit text-[10px] tracking-wider uppercase">
                    <GraduationCap className="w-3 h-3 mr-1" /> Student
                  </Badge>
                </div>

                <div className="space-y-1.5 text-sm text-zinc-500">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>Campus Location</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>{org.name}</span>
                  </div>
                </div>
              </div>

              {/* Settings button */}
              <div className="shrink-0 pt-2 sm:pt-4 self-start">
                <Button variant="default" className="bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm font-bold text-xs uppercase tracking-wider">
                  <Settings className="w-3.5 h-3.5 mr-2" /> Account Settings
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="grid grid-cols-1 sm:grid-cols-3 gap-6"
      >

      </motion.div>

      {/* Streak message */}
      {stats.streak > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, ease: "easeOut", duration: 0.4 }}
          className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-3 flex items-center gap-3"
        >
          <Flame className="w-5 h-5 text-orange-500 shrink-0" />
          <p className="text-sm font-semibold text-orange-800">
            {streakMessage(stats.streak)}
          </p>
        </motion.div>
      )}

      {/* Content Grid */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeBottom}
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        {/* Left 2/3 — Achievements + Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Achievements */}
          <Card className="border border-zinc-200 shadow-sm bg-white">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" /> Achievements
                </h3>
                <span className="text-xs font-semibold text-zinc-400 bg-zinc-100 px-2.5 py-1 rounded-full">
                  {unlockedAchievements.length}/{achievements.length}
                </span>
              </div>
            </CardHeader>
            <Separator className="bg-zinc-100" />
            <CardContent className="p-6">
              {achievements.length === 0 ? (
                <div className="text-center py-8 text-zinc-400 text-sm">
                  <Award className="w-10 h-10 mx-auto mb-3 text-zinc-300" />
                  Complete courses and quizzes to earn achievements!
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {achievements.map((badge, i) => (
                    <div
                      key={i}
                      className={`flex flex-col items-center p-4 rounded-xl border transition-all group cursor-pointer relative ${
                        badge.unlocked
                          ? "border-zinc-200 bg-zinc-50 hover:border-blue-200 hover:bg-blue-50"
                          : "border-dashed border-zinc-200 bg-zinc-50 opacity-50 grayscale"
                      }`}
                    >
                      <div
                        className={`w-14 h-14 rounded-full bg-gradient-to-br ${badge.color} flex items-center justify-center shadow-sm mb-3 transform transition-transform ${
                          badge.unlocked ? "group-hover:scale-110 group-hover:rotate-6" : ""
                        }`}
                      >
                        <span className="text-xl">{badge.icon}</span>
                      </div>
                      <p className="text-sm font-bold text-zinc-700 text-center">{badge.name}</p>
                      {!badge.unlocked && <p className="text-[10px] text-zinc-400 mt-1">Locked</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border border-zinc-200 shadow-sm bg-white">
            <CardHeader className="pb-4">
              <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-zinc-500" /> Recent Activity
              </h3>
            </CardHeader>
            <Separator className="bg-zinc-100" />
            <CardContent className="p-6 space-y-5">
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-zinc-400 text-sm">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 text-zinc-300" />
                  No recent activity yet. Start learning!
                </div>
              ) : (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center shrink-0 mt-0.5">
                      <ActivityIcon type={activity.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-zinc-800">{activity.title}</p>
                      <p className="text-sm text-zinc-400 mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1/3 — My Courses + XP */}
        <div className="space-y-6">
          {/* Course Progress */}
          <Card className="border border-zinc-200 shadow-sm bg-white">
            <CardHeader className="border-b border-zinc-100 pb-4">
              <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" /> My Courses
              </h3>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div className="bg-zinc-50 rounded-lg p-4 text-center border border-zinc-100">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Enrolled</p>
                  <p className="text-xl font-black text-zinc-800">
                    <AnimatedNumber value={stats.enrollmentCount} />
                  </p>
                </div>
                <div className="bg-zinc-50 rounded-lg p-4 text-center border border-zinc-100">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Completed</p>
                  <p className="text-xl font-black text-zinc-800">
                    <AnimatedNumber value={stats.completedCourses} />
                  </p>
                </div>
              </div>

              {profileData.courses.length === 0 ? (
                <div className="text-center py-6 text-zinc-400 text-sm">
                  No courses yet. Start learning!
                </div>
              ) : (
                <div className="space-y-3">
                  {profileData.courses.map((course) => (
                    <Link key={course.id} href={`/student/courses/${course.id}`} className="block">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 border border-zinc-100 hover:border-zinc-200 hover:bg-white transition-all">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                          <BookOpen className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-zinc-800 truncate">{course.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                                style={{ width: `${Math.max(course.progress, 3)}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-zinc-500">{course.progress}%</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* XP Overview */}
          <Card className="border border-zinc-200 shadow-sm bg-white">
            <CardHeader className="border-b border-zinc-100 pb-4">
              <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-600" /> Total XP
              </h3>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-center gap-4 py-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center shadow-md">
                  <span className="text-2xl font-black text-white">
                    <AnimatedNumber value={stats.xp} />
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Experience Points</p>

                </div>
              </div>
              <div className="mt-4 bg-zinc-50 rounded-lg p-3">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-zinc-500">Learning Hours</span>
                  <span className="font-bold text-zinc-800">{stats.learningHours}h</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500"
                    style={{ width: `${Math.min((stats.learningHours / 100) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      <input
        type="file"
        ref={avatarInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload("avatar", file);
        }}
      />
      <input
        type="file"
        ref={coverInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload("cover", file);
        }}
      />
    </div>
  );
}
