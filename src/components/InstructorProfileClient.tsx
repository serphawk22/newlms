"use client";

import { motion, useMotionValue, useTransform, useSpring, useMotionValueEvent, type Variants } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, PlayCircle,
  Settings, Camera, X, Plus
} from "lucide-react";
import { RingLoader } from "@/components/ui/ring-loader";

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
        <span key={s} className="text-xs" style={{ color: s <= rating ? "#D9252A" : "var(--border)" }}>★</span>
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
          <Button variant="ghost" className="px-0 transition-colors" style={{ color: "var(--muted-foreground)" }}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
        </Link>
      </motion.div>

      {/* Profile Header */}
      <motion.div initial="hidden" animate="visible" variants={fadeTop} className="relative">
        <Card className="overflow-hidden rounded-2xl" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
          {/* Cover Photo */}
          <div
            className="h-44 w-full bg-cover bg-center relative"
            style={coverImage ? { backgroundImage: `url(${coverImage})` } : {}}
          >
            {!coverImage && <div className="absolute inset-0" style={{ background: "linear-gradient(to right, var(--foreground), #444)" }} />}
          </div>

          <CardContent className="px-6 sm:px-8 pb-8 pt-0 relative">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16 mb-4">
              {/* Profile Picture */}
              <div className="relative shrink-0 z-10">
                <div className="w-32 h-32 rounded-full overflow-hidden flex items-center justify-center" style={{ border: "4px solid var(--card)", background: "var(--muted)" }}>
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
                  <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>{userName}</h2>
                  <Badge variant="default" className="w-fit mx-auto sm:mx-0 text-[10px] font-semibold tracking-wider uppercase py-1 px-2.5 rounded-full" style={{ background: "#D9252A", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.15)" }}>
                    {role}
                  </Badge>
                </div>

                <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
                  <span className="truncate">{userEmail}</span>
                  <span>Campus Location</span>
                  <span>{orgName}</span>
                </div>
              </div>

              {/* Edit button */}
              <div className="shrink-0 self-center md:self-end">
                <Button
                  onClick={openModal}
                  variant="outline"
                  className="font-semibold text-xs py-2 px-4 rounded-xl transition-all"
                  style={{ background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                >
                  <Settings className="w-3.5 h-3.5 mr-2" /> Account Settings
                </Button>
              </div>
            </div>

            {/* Bio & Skills Section inside header wrapper */}
            {(bio || skills.length > 0) && (
              <div className="mt-6 pt-6 flex flex-col gap-4 text-center md:text-left" style={{ borderTop: "1px solid var(--border)" }}>
                {bio && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted-foreground)" }}>About Me</h4>
                    <p className="text-sm leading-relaxed max-w-2xl mx-auto md:mx-0" style={{ color: "var(--foreground)" }}>{bio}</p>
                  </div>
                )}
                {skills.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)" }}>Expertise & Skills</h4>
                    <div className="flex flex-wrap justify-center md:justify-start gap-2">
                      {skills.map((skill, idx) => (
                        <Badge key={idx} variant="secondary" className="px-3 py-1 text-xs rounded-full font-medium" style={{ background: "rgba(217,37,42,0.08)", color: "#D9252A", border: "1px solid rgba(217,37,42,0.25)" }}>
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
          <Card className="p-6 rounded-2xl" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
            <div>
              <div>
                <p className="text-2xl font-black" style={{ color: "var(--foreground)" }}>
                  <AnimatedNumber value={courses.length} />
                </p>
                <p className="text-xs font-bold uppercase tracking-wider mt-0.5" style={{ color: "var(--muted-foreground)" }}>My Courses</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {!isAdmin && (
          <motion.div variants={staggerItem} whileHover={{ y: -2 }}>
            <Card className="p-6 rounded-2xl" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
              <div>
                <div>
                  <p className="text-2xl font-black" style={{ color: "var(--foreground)" }}>
                    {avgRating !== null ? avgRating.toFixed(1) : "N/A"}
                  </p>
                  <p className="text-xs font-bold uppercase tracking-wider mt-0.5" style={{ color: "var(--muted-foreground)" }}>Average Rating</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        <motion.div variants={staggerItem} whileHover={{ y: -2 }}>
          <Card className="p-6 rounded-2xl" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
            <div>
              <div>
                <p className="text-2xl font-black" style={{ color: "var(--foreground)" }}>
                  <AnimatedNumber value={totalStudents} />
                </p>
                <p className="text-xs font-bold uppercase tracking-wider mt-0.5" style={{ color: "var(--muted-foreground)" }}>Total Students</p>
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
          <Card className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold" style={{ color: "var(--foreground)" }}>My Published Courses</CardTitle>
            </CardHeader>
            <Separator style={{ background: "var(--border)" }} />
            <CardContent className="p-0">
              {courses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                  <p className="font-semibold mb-1" style={{ color: "var(--muted-foreground)" }}>No courses yet</p>
                  <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>Create your first course to get started.</p>
                  <Link href={dashboardLink}>
                    <Button variant="default" className="font-bold text-xs uppercase tracking-wider py-2 px-4 rounded-xl" style={{ background: "#D9252A", color: "#FFFFFF" }}>
                      <Plus className="w-3.5 h-3.5 mr-2" /> Create Course
                    </Button>
                  </Link>
                </div>
              ) : (
                <div style={{ borderTop: "1px solid var(--border)" }}>
                  {courses.map((course) => (
                    <div key={course.id} className="p-5 flex items-center gap-4 transition-colors" style={{ borderBottom: "1px solid var(--border)" }}>
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
                        {course.published ? (
                          <PlayCircle className="w-6 h-6" style={{ color: "var(--muted-foreground)" }} />
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`${dashboardLink}/courses/${course.id}`}
                          className="font-semibold transition-colors"
                          style={{ color: "var(--foreground)" }}
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
                        <Button variant="ghost" size="sm" className="font-semibold" style={{ color: "var(--muted-foreground)" }}>
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
            <Card className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold" style={{ color: "var(--foreground)" }}>Recent Feedback</CardTitle>
              </CardHeader>
              <Separator style={{ background: "var(--border)" }} />
              <CardContent className="p-6 space-y-5">
                {reviews.length === 0 ? (
                  <div className="text-center py-4 text-sm" style={{ color: "var(--muted-foreground)" }}>
                    No reviews yet for your courses.
                  </div>
                ) : (
                  reviews.map((review, i) => (
                    <div key={review.id}>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5" style={{ background: "rgba(217,37,42,0.12)", color: "#D9252A", border: "1px solid rgba(217,37,42,0.25)" }}>
                          {review.studentInitial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <span className="text-sm font-bold truncate block max-w-[120px]" style={{ color: "var(--foreground)" }}>{review.studentName}</span>
                              <span className="text-[10px] truncate block max-w-[120px]" style={{ color: "var(--muted-foreground)" }}>{review.courseTitle}</span>
                            </div>
                            <StarRating rating={review.rating} />
                          </div>
                          <p className="text-xs italic mt-2 p-3 rounded-xl" style={{ color: "var(--foreground)", background: "var(--secondary-background, var(--card))", border: "1px solid var(--border)" }}>
                            &ldquo;{review.comment}&rdquo;
                          </p>
                        </div>
                      </div>
                      {i < reviews.length - 1 && <Separator className="mt-5" style={{ background: "var(--border)" }} />}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity animate-in fade-in" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-3xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Edit Profile</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full transition-colors"
                style={{ color: "var(--muted-foreground)" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Cover Photo Upload */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: "var(--muted-foreground)" }}>Cover Photo</label>
                <div
                  className="h-28 w-full bg-cover bg-center rounded-2xl relative overflow-hidden"
                  style={modalCover ? { backgroundImage: `url(${modalCover})` } : { background: "var(--foreground)" }}
                >
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={uploadingCover}
                    className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    style={{ background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                  >
                    {uploadingCover ? <RingLoader size="sm" className="inline-flex" /> : <Camera className="w-3.5 h-3.5" />}
                    Upload cover image
                  </button>
                </div>
              </div>

              {/* Profile Photo Upload */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: "var(--muted-foreground)" }}>Profile Photo</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden shrink-0" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
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
                      className="px-3 py-1.5 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      style={{ background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                    >
                      {uploadingAvatar ? <RingLoader size="sm" className="inline-flex" /> : <Camera className="w-3.5 h-3.5" />}
                      Upload profile photo
                    </button>
                    {modalAvatar && (
                      <button
                        type="button"
                        onClick={() => setModalAvatar("")}
                        className="font-semibold text-xs px-2.5 py-1.5 rounded-xl transition-colors"
                        style={{ color: "#D9252A" }}
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: "var(--muted-foreground)" }}>Full Name</label>
                <input
                  type="text"
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all font-medium"
                  style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                  placeholder="Enter your name"
                />
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: "var(--muted-foreground)" }}>Bio</label>
                <textarea
                  value={modalBio}
                  onChange={(e) => setModalBio(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all font-medium resize-none"
                  style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                  placeholder="Tell us about yourself"
                />
              </div>

              {/* Interests / Skills */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: "var(--muted-foreground)" }}>Interests / Skills</label>
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
                    className="flex-1 rounded-xl px-4 py-2 text-sm focus:outline-none transition-all"
                    style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                    placeholder="Add a skill or interest"
                  />
                  <Button
                    type="button"
                    onClick={addSkill}
                    className="rounded-xl px-3 transition-colors"
                    style={{ background: "var(--muted)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2">
                  {modalSkills.map((skill, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="px-2.5 py-1 text-xs rounded-full font-medium flex items-center gap-1.5"
                      style={{ background: "rgba(217,37,42,0.08)", color: "#D9252A", border: "1px solid rgba(217,37,42,0.25)" }}
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="p-0.5 rounded-full transition-colors"
                        style={{ color: "#D9252A" }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  {modalSkills.length === 0 && (
                    <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>No skills or interests added yet.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 flex justify-end gap-3 shrink-0" style={{ borderTop: "1px solid var(--border)", background: "var(--secondary-background, var(--card))" }}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold"
                style={{ color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2"
                style={{ background: "#D9252A", color: "#FFFFFF" }}
              >
                {isSaving && <RingLoader size="sm" className="inline-flex" />}
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
