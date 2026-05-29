"use client";

import { motion, useMotionValue, useTransform, useSpring, useMotionValueEvent, type Variants } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, BookOpen, Users, Star, PlayCircle,
  Building2, Mail, Edit, Plus, Camera, GraduationCap,
  X, CheckCircle2, AlertCircle, Save,
} from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { ExpertiseEditor } from "@/components/ExpertiseEditor";

interface CourseItem {
  id: string; title: string; published: boolean;
}

interface ReviewItem {
  id: string; studentName: string; studentInitial: string;
  courseTitle: string; rating: number; comment: string;
}

interface InstructorProfileClientProps {
  userName: string; userEmail: string; userAvatarSeed: string;
  orgName: string; isAdmin: boolean;
  courses: CourseItem[]; totalStudents: number;
  avgRating: number | null; expertise: string[];
  reviews: ReviewItem[];
}

const skillColors = [
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-green-100 text-green-700 border-green-200",
  "bg-purple-100 text-purple-700 border-purple-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-rose-100 text-rose-700 border-rose-200",
  "bg-cyan-100 text-cyan-700 border-cyan-200",
  "bg-indigo-100 text-indigo-700 border-indigo-200",
  "bg-emerald-100 text-emerald-700 border-emerald-200",
];

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

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={`text-xs ${s <= rating ? "text-amber-400" : "text-zinc-200"}`}>★</span>
      ))}
    </div>
  );
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

export function InstructorProfileClient({
  userName, userEmail, userAvatarSeed,
  orgName, isAdmin,
  courses, totalStudents, avgRating,
  expertise, reviews,
}: InstructorProfileClientProps) {
  const role = isAdmin ? "ADMIN" : "INSTRUCTOR";

  // Edit profile state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(userName);
  const [editBio, setEditBio] = useState("");
  const [editExpertise, setEditExpertise] = useState<string[]>(expertise);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // Load current bio from server on modal open
  useEffect(() => {
    if (showEditModal) {
      fetch("/api/instructor/profile")
        .then((r) => r.json())
        .then((data) => {
          setEditName(data.name || userName);
          setEditBio(data.bio || "");
          setEditExpertise(data.expertise || expertise);
        })
        .catch(() => {});
    }
  }, [showEditModal, userName, expertise]);

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      setEditError("Name is required");
      return;
    }
    setSaving(true);
    setEditError(null);
    try {
      const res = await fetch("/api/instructor/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          bio: editBio.trim(),
          expertise: editExpertise,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || "Failed to save profile");
        return;
      }
      setToast({ message: "Profile updated successfully", type: "success" });
      setTimeout(() => setToast(null), 3000);
      setShowEditModal(false);
    } catch {
      setEditError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-page space-y-8">
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border bg-white border-emerald-200 animate-in slide-in-from-top-2 fade-in">
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500" />
          )}
          <span className="text-sm font-bold text-zinc-800">{toast.message}</span>
        </div>
      )}

      {/* Back link */}
      <motion.div initial="hidden" animate="visible" variants={fadeTop}>
        <Link href="/instructor">
          <Button variant="ghost" className="text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 px-0">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
        </Link>
      </motion.div>

      {/* Banner + Avatar */}
      <motion.div initial="hidden" animate="visible" variants={fadeTop} className="relative">
        <Card className="border border-zinc-200 shadow-sm bg-white overflow-hidden rounded-xl">
          <div className="h-28 w-full bg-gradient-to-r from-zinc-900 to-zinc-800" />

          <CardContent className="px-8 pb-8 pt-0 relative">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {/* Avatar — overlaps banner by 50% */}
              <div className="relative -mt-14 shrink-0">
                <div className="w-24 h-24 sm:w-24 sm:h-24 rounded-full ring-4 ring-white shadow-lg overflow-hidden bg-zinc-100">
                  <img
                    src={`https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(userAvatarSeed)}&backgroundColor=transparent`}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 pt-2 sm:pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-zinc-900 truncate">{userName}</h2>
                  <Badge variant="default" className="w-fit text-[10px] tracking-wider uppercase">
                    {role}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-sm text-zinc-500">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span className="truncate">{userEmail}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>{orgName}</span>
                  </div>
                </div>
              </div>

              {/* Edit button */}
              <div className="shrink-0 pt-2 sm:pt-4 self-start">
                <Button
                  variant="default"
                  onClick={() => setShowEditModal(true)}
                  className="bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm font-bold text-xs uppercase tracking-wider"
                >
                  <Edit className="w-3.5 h-3.5 mr-2" /> Edit Profile
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
        <motion.div variants={staggerItem} whileHover={{ y: -2 }}>
          <Card className="border border-zinc-200 shadow-sm bg-white p-6 transition-shadow hover:shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <PlayCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-zinc-900">
                  <AnimatedNumber value={courses.length} />
                </p>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mt-0.5">My Courses</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={staggerItem} whileHover={{ y: -2 }}>
          <Card className="border border-zinc-200 shadow-sm bg-white p-6 transition-shadow hover:shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Star className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-zinc-900">
                  {avgRating !== null ? avgRating.toFixed(1) : "N/A"}
                </p>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mt-0.5">Average Rating</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={staggerItem} whileHover={{ y: -2 }}>
          <Card className="border border-zinc-200 shadow-sm bg-white p-6 transition-shadow hover:shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-zinc-900">
                  <AnimatedNumber value={totalStudents} />
                </p>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mt-0.5">Total Students</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Content Grid */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeBottom}
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        {/* Left 2/3 — Courses */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-zinc-200 shadow-sm bg-white">
            <CardHeader className="border-b border-zinc-100 pb-4">
              <CardTitle className="text-lg font-bold text-zinc-900">My Published Courses</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {courses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-8">
                  <BookOpen className="w-12 h-12 text-zinc-300 mb-4" />
                  <p className="text-zinc-500 font-semibold mb-1">No courses yet</p>
                  <p className="text-sm text-zinc-400 mb-6">Create your first course to get started.</p>
                  <Link href="/instructor">
                    <Button variant="default" className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider">
                      <Plus className="w-3.5 h-3.5 mr-2" /> Create Course
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {courses.map((course) => (
                    <div key={course.id} className="p-5 flex items-center gap-4 hover:bg-zinc-50 transition-colors">
                      <div className="w-14 h-14 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0 overflow-hidden">
                        {course.published ? (
                          <PlayCircle className="w-7 h-7 text-zinc-400" />
                        ) : (
                          <BookOpen className="w-7 h-7 text-zinc-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/instructor/courses/${course.id}`}
                          className="font-semibold text-zinc-900 hover:text-blue-600 transition-colors"
                        >
                          {course.title}
                        </Link>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge
                            variant={course.published ? "secondary" : "outline"}
                            className="text-[10px] font-bold tracking-wider"
                          >
                            {course.published ? "PUBLISHED" : "DRAFT"}
                          </Badge>
                        </div>
                      </div>
                      <Link href={`/instructor/courses/${course.id}`}>
                        <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-blue-600">
                          Manage
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1/3 — Expertise + Reviews */}
        <div className="space-y-6">
          {/* Expertise */}
          <Card className="border border-zinc-200 shadow-sm bg-white">
            <CardHeader className="border-b border-zinc-100 pb-4">
              <CardTitle className="text-lg font-bold text-zinc-900">Expertise</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {expertise.length === 0 ? (
                <div>
                  <p className="text-sm text-zinc-400 italic mb-4">No skills added yet.</p>
                </div>
              ) : (
                <ExpertiseEditor initialSkills={expertise} />
              )}
            </CardContent>
          </Card>

          {/* Bio */}
          <Card className="border border-zinc-200 shadow-sm bg-white">
            <CardHeader className="border-b border-zinc-100 pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold text-zinc-900">About</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-zinc-500 leading-relaxed">
                Educator passionate about creating engaging learning experiences.
                Dedicated to helping students achieve their goals through well-structured courses and personalized mentorship.
              </p>
            </CardContent>
          </Card>

          <Separator className="bg-zinc-200" />

          {/* Recent Reviews */}
          <Card className="border border-zinc-200 shadow-sm bg-white">
            <CardHeader className="border-b border-zinc-100 pb-4">
              <CardTitle className="text-lg font-bold text-zinc-900">Recent Feedback</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              {reviews.length === 0 ? (
                <div className="text-center py-4 text-zinc-400 text-sm">
                  <GraduationCap className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                  No reviews yet for your courses.
                </div>
              ) : (
                reviews.map((review, i) => (
                  <div key={review.id}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {review.studentInitial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="text-sm font-bold text-zinc-800">{review.studentName}</span>
                            <span className="ml-2 text-xs text-zinc-400">{review.courseTitle}</span>
                          </div>
                          <StarRating rating={review.rating} />
                        </div>
                        <p className="text-xs text-zinc-500 italic mt-1.5 bg-zinc-50 p-3 rounded-lg border border-zinc-100">
                          &ldquo;{review.comment}&rdquo;
                        </p>
                      </div>
                    </div>
                    {i < reviews.length - 1 && <Separator className="mt-5 bg-zinc-100" />}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* ── Edit Profile Modal ── */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h3 className="text-lg font-bold text-zinc-900">Edit Profile</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Full Name</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Your full name"
                  className="bg-zinc-50 border-zinc-200"
                />
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Bio</label>
                <Textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  className="bg-zinc-50 border-zinc-200 resize-none"
                />
              </div>

              {/* Expertise */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Expertise (comma separated)</label>
                <Input
                  value={editExpertise.join(", ")}
                  onChange={(e) => setEditExpertise(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                  placeholder="e.g. JavaScript, Python, Machine Learning"
                  className="bg-zinc-50 border-zinc-200"
                />
                {editExpertise.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {editExpertise.map((skill, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Error */}
              {editError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-medium text-red-700">{editError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 border-zinc-200"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveProfile}
                  disabled={saving || !editName.trim()}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white"
                >
                  {saving ? (
                    <>
                      <Loader size="sm" variant="bars" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" /> Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
