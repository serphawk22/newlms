"use client";

import { motion, useMotionValue, useTransform, useSpring, useMotionValueEvent, type Variants } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, BookOpen, Users, Star, PlayCircle,
  Building2, Mail, MapPin, Settings, Camera, Award, Loader, X, Plus, GraduationCap
} from "lucide-react";

interface CourseItem {
  id: string;
  title: string;
  published: boolean;
}

interface ReviewItem {
  id: string;
  studentName: string;
  studentInitial: string;
  courseTitle: string;
  rating: number;
  comment: string;
}

interface InstructorProfileClientProps {
  userName: string;
  userEmail: string;
  userAvatarSeed: string;
  userAvatar?: string | null;
  userCoverImage?: string | null;
  userBio?: string | null;
  orgName: string;
  isAdmin: boolean;
  courses: CourseItem[];
  totalStudents: number;
  avgRating: number | null;
  expertise: string[];
  reviews: ReviewItem[];
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
  userName: initialName,
  userEmail,
  userAvatarSeed,
  userAvatar,
  userCoverImage,
  userBio,
  orgName,
  isAdmin,
  courses,
  totalStudents,
  avgRating,
  expertise: initialExpertise,
  reviews,
}: InstructorProfileClientProps) {
  const role = isAdmin ? "ADMIN" : "INSTRUCTOR";
  const dashboardLink = isAdmin ? "/admin" : "/instructor";

  // Real-time Page display state
  const [userName, setUserName] = useState(initialName);
  const [bio, setBio] = useState(userBio || "");
  const [avatar, setAvatar] = useState(userAvatar || "");
  const [coverImage, setCoverImage] = useState(userCoverImage || "");
  const [skills, setSkills] = useState<string[]>(initialExpertise || []);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalName, setModalName] = useState(userName);
  const [modalBio, setModalBio] = useState(bio);
  const [modalAvatar, setModalAvatar] = useState(avatar);
  const [modalCover, setModalCover] = useState(coverImage);
  const [modalSkills, setModalSkills] = useState<string[]>(skills);
  const [newSkill, setNewSkill] = useState("");

  // Upload Loaders
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Sync state when modal opens
  const openModal = () => {
    setModalName(userName);
    setModalBio(bio);
    setModalAvatar(avatar);
    setModalCover(coverImage);
    setModalSkills([...skills]);
    setIsModalOpen(true);
  };

  // Upload handler for Cloudinary
  async function handleCloudinaryUpload(type: "avatar" | "cover", file: File) {
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

      if (type === "avatar") {
        setModalAvatar(result.secure_url);
      } else {
        setModalCover(result.secure_url);
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setLoading(false);
    }
  }

  // Save changes
  async function handleSaveChanges() {
    setIsSaving(true);
    try {
      const response = await fetch("/api/instructor/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: modalName,
          bio: modalBio,
          avatar: modalAvatar,
          coverImage: modalCover,
          expertise: modalSkills,
        }),
      });

      if (response.ok) {
        // Instantly update page layout without refresh
        setUserName(modalName);
        setBio(modalBio);
        setAvatar(modalAvatar);
        setCoverImage(modalCover);
        setSkills(modalSkills);
        setIsModalOpen(false);
      } else {
        console.error("Failed to save profile changes");
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setIsSaving(false);
    }
  }

  // Tag list handling
  const addSkill = () => {
    if (newSkill.trim() && !modalSkills.includes(newSkill.trim())) {
      setModalSkills([...modalSkills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const removeSkill = (tagToRemove: string) => {
    setModalSkills(modalSkills.filter((s) => s !== tagToRemove));
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 sm:px-6">
      {/* Back link */}
      <motion.div initial="hidden" animate="visible" variants={fadeTop}>
        <Link href={dashboardLink}>
          <Button variant="ghost" className="text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 px-0 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
        </Link>
      </motion.div>

      {/* Profile Header */}
      <motion.div initial="hidden" animate="visible" variants={fadeTop} className="relative">
        <Card className="border border-zinc-100 shadow-sm bg-white overflow-hidden rounded-2xl">
          {/* Cover Photo */}
          <div
            className="h-44 w-full bg-cover bg-center relative"
            style={coverImage ? { backgroundImage: `url(${coverImage})` } : {}}
          >
            {!coverImage && <div className="absolute inset-0 bg-gradient-to-r from-zinc-800 to-zinc-700" />}
          </div>

          <CardContent className="px-6 sm:px-8 pb-8 pt-0 relative">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16 mb-4">
              {/* Profile Picture */}
              <div className="relative shrink-0 z-10">
                <div className="w-32 h-32 rounded-full ring-4 ring-white shadow-md overflow-hidden bg-zinc-50 flex items-center justify-center">
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <img
                      src={`https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(userName || userEmail)}&backgroundColor=transparent`}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>

              {/* Identity & Basic details */}
              <div className="flex-1 min-w-0 text-center md:text-left pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-center md:justify-start gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">{userName}</h2>
                  <Badge variant="default" className="w-fit mx-auto sm:mx-0 text-[10px] bg-zinc-900 text-white font-semibold tracking-wider uppercase py-1 px-2.5 rounded-full border border-zinc-800">
                    {role}
                  </Badge>
                </div>

                <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 text-sm text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span className="truncate">{userEmail}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>Campus Location</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>{orgName}</span>
                  </div>
                </div>
              </div>

              {/* Edit button */}
              <div className="shrink-0 self-center md:self-end">
                <Button
                  onClick={openModal}
                  variant="outline"
                  className="bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-200 shadow-sm font-semibold text-xs py-2 px-4 rounded-xl transition-all"
                >
                  <Settings className="w-3.5 h-3.5 mr-2" /> Account Settings
                </Button>
              </div>
            </div>

            {/* Bio & Skills Section inside header wrapper */}
            {(bio || skills.length > 0) && (
              <div className="mt-6 pt-6 border-t border-zinc-100 flex flex-col gap-4 text-center md:text-left">
                {bio && (
                  <div>
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">About Me</h4>
                    <p className="text-zinc-600 text-sm leading-relaxed max-w-2xl mx-auto md:mx-0">{bio}</p>
                  </div>
                )}
                {skills.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Expertise & Skills</h4>
                    <div className="flex flex-wrap justify-center md:justify-start gap-2">
                      {skills.map((skill, idx) => (
                        <Badge key={idx} variant="secondary" className="bg-blue-50/50 hover:bg-blue-50 text-blue-700 border border-blue-100/80 px-3 py-1 text-xs rounded-full font-medium transition-colors">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className={`grid grid-cols-1 ${isAdmin ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-6`}
      >
        <motion.div variants={staggerItem} whileHover={{ y: -2 }}>
          <Card className="border border-zinc-100 shadow-sm bg-white p-6 rounded-2xl hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50/50 flex items-center justify-center shrink-0">
                <PlayCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-zinc-900">
                  <AnimatedNumber value={courses.length} />
                </p>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mt-0.5">My Courses</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {!isAdmin && (
          <motion.div variants={staggerItem} whileHover={{ y: -2 }}>
            <Card className="border border-zinc-100 shadow-sm bg-white p-6 rounded-2xl hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50/50 flex items-center justify-center shrink-0">
                  <Star className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-black text-zinc-900">
                    {avgRating !== null ? avgRating.toFixed(1) : "N/A"}
                  </p>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mt-0.5">Average Rating</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        <motion.div variants={staggerItem} whileHover={{ y: -2 }}>
          <Card className="border border-zinc-100 shadow-sm bg-white p-6 rounded-2xl hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50/50 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-zinc-900">
                  <AnimatedNumber value={totalStudents} />
                </p>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mt-0.5">Total Students</p>
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
        className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in duration-300"
      >
        {/* Left Column (Published Courses) */}
        <div className={`space-y-6 ${isAdmin ? "lg:col-span-3" : "lg:col-span-2"}`}>
          <Card className="border border-zinc-100 shadow-sm bg-white rounded-2xl overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-zinc-900">My Published Courses</CardTitle>
            </CardHeader>
            <Separator className="bg-zinc-100" />
            <CardContent className="p-0">
              {courses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                  <BookOpen className="w-12 h-12 text-zinc-300 mb-4" />
                  <p className="text-zinc-500 font-semibold mb-1">No courses yet</p>
                  <p className="text-sm text-zinc-400 mb-6">Create your first course to get started.</p>
                  <Link href={dashboardLink}>
                    <Button variant="default" className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider py-2 px-4 rounded-xl">
                      <Plus className="w-3.5 h-3.5 mr-2" /> Create Course
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {courses.map((course) => (
                    <div key={course.id} className="p-5 flex items-center gap-4 hover:bg-zinc-50/50 transition-colors">
                      <div className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0 shadow-sm">
                        {course.published ? (
                          <PlayCircle className="w-6 h-6 text-zinc-400" />
                        ) : (
                          <BookOpen className="w-6 h-6 text-zinc-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`${dashboardLink}/courses/${course.id}`}
                          className="font-semibold text-zinc-900 hover:text-blue-600 transition-colors"
                        >
                          {course.title}
                        </Link>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge
                            variant={course.published ? "secondary" : "outline"}
                            className="text-[10px] font-bold tracking-wider rounded-full px-2 py-0.5"
                          >
                            {course.published ? "PUBLISHED" : "DRAFT"}
                          </Badge>
                        </div>
                      </div>
                      <Link href={`${dashboardLink}/courses/${course.id}`}>
                        <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-blue-600 font-semibold">
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

        {/* Right Column (Recent Feedback) - Hidden for Admin */}
        {!isAdmin && (
          <div className="space-y-6">
            <Card className="border border-zinc-100 shadow-sm bg-white rounded-2xl overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-zinc-900">Recent Feedback</CardTitle>
              </CardHeader>
              <Separator className="bg-zinc-100" />
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
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-sm border border-blue-100">
                          {review.studentInitial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <span className="text-sm font-bold text-zinc-800 truncate block max-w-[120px]">{review.studentName}</span>
                              <span className="text-[10px] text-zinc-400 truncate block max-w-[120px]">{review.courseTitle}</span>
                            </div>
                            <StarRating rating={review.rating} />
                          </div>
                          <p className="text-xs text-zinc-500 italic mt-2 bg-zinc-50/50 p-3 rounded-xl border border-zinc-100">
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
        )}
      </motion.div>

      {/* Unified Account Settings / Edit Profile Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm transition-opacity animate-in fade-in">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-zinc-100 flex flex-col max-h-[90vh] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h3 className="text-base font-bold text-zinc-900">Edit Profile</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-full hover:bg-zinc-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Cover Photo Upload */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Cover Photo</label>
                <div
                  className="h-28 w-full bg-cover bg-center rounded-2xl relative border border-zinc-200 overflow-hidden bg-zinc-800"
                  style={modalCover ? { backgroundImage: `url(${modalCover})` } : {}}
                >
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={uploadingCover}
                    className="absolute bottom-3 right-3 bg-white/95 text-zinc-700 shadow-sm border border-zinc-200 hover:bg-white px-3 py-1.5 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {uploadingCover ? <Loader className="w-3.5 h-3.5 animate-spin text-zinc-500" /> : <Camera className="w-3.5 h-3.5 text-zinc-500" />}
                    Upload cover image
                  </button>
                </div>
              </div>

              {/* Profile Photo Upload */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Profile Photo</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-50 border border-zinc-200 shrink-0 shadow-sm">
                    {modalAvatar ? (
                      <img src={modalAvatar} alt="Preview Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <img
                        src={`https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(modalName || userEmail)}&backgroundColor=transparent`}
                        alt="Preview Avatar"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="bg-white hover:bg-zinc-50 text-zinc-700 shadow-sm border border-zinc-200 px-3 py-1.5 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {uploadingAvatar ? <Loader className="w-3.5 h-3.5 animate-spin text-zinc-500" /> : <Camera className="w-3.5 h-3.5 text-zinc-500" />}
                      Upload profile photo
                    </button>
                    {modalAvatar && (
                      <button
                        type="button"
                        onClick={() => setModalAvatar("")}
                        className="text-red-500 hover:text-red-600 font-semibold text-xs px-2.5 py-1.5 rounded-xl hover:bg-red-50/50 transition-colors"
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Full Name</label>
                <input
                  type="text"
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  className="w-full bg-zinc-50/50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-300 focus:border-zinc-300 transition-all font-medium"
                  placeholder="Enter your name"
                />
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Bio</label>
                <textarea
                  value={modalBio}
                  onChange={(e) => setModalBio(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-50/50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-300 focus:border-zinc-300 transition-all font-medium resize-none"
                  placeholder="Tell us about yourself"
                />
              </div>

              {/* Interests / Skills */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Interests / Skills</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                    className="flex-1 bg-zinc-50/50 border border-zinc-200 rounded-xl px-4 py-2 text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-300 focus:border-zinc-300 transition-all"
                    placeholder="Add a skill or interest"
                  />
                  <Button
                    type="button"
                    onClick={addSkill}
                    className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl px-3 border border-zinc-200 shadow-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2">
                  {modalSkills.map((skill, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-blue-50/70 text-blue-700 border border-blue-100 px-2.5 py-1 text-xs rounded-full font-medium flex items-center gap-1.5 shadow-sm"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="hover:bg-blue-100 p-0.5 rounded-full text-blue-500 hover:text-blue-700 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  {modalSkills.length === 0 && (
                    <span className="text-xs text-zinc-400">No skills or interests added yet.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 flex justify-end gap-3 shrink-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-600 hover:bg-zinc-100 border border-zinc-200 px-4 py-2 rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="bg-zinc-900 hover:bg-zinc-800 text-white px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2"
              >
                {isSaving && <Loader className="w-3.5 h-3.5 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={avatarInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleCloudinaryUpload("avatar", file);
        }}
      />
      <input
        type="file"
        ref={coverInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleCloudinaryUpload("cover", file);
        }}
      />
    </div>
  );
}
