"use client";

import { motion, type Variants } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, BookOpen, MapPin, Settings, Trophy, Star,
  Building2, Mail, Camera, Award, Loader, X, Plus, Flame, GraduationCap, ChevronDown
} from "lucide-react";
import { RingLoader } from "@/components/ui/ring-loader";

interface Achievement {
  name: string;
  icon: string;
  color: string;
  unlocked: boolean;
  criteria?: string;
}

interface ActivityItem {
  id: string;
  title: string;
  time: string;
  type: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatarSeed: string;
  avatar: string | null;
  coverImage: string | null;
  bio?: string | null;
  expertise?: string[];
}

interface ProfileData {
  user: User;
  org: { id: string; name: string };
  stats: {
    enrollmentCount: number;
    completedCourses: number;
    learningHours: number;
    xp: number;
    level: number;
    rank: string;
    streak: number;
  };
  achievements: Achievement[];
  recentActivity: ActivityItem[];
}

const fadeTop: Variants = {
  hidden: { y: -20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { ease: "easeOut", duration: 0.4 } },
};

const fadeBottom: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { ease: "easeOut", duration: 0.4 } },
};

export function StudentProfileClient({ profileData, initialOrgName }: {
  profileData: ProfileData;
  initialOrgName: string;
}) {
  const { org, stats, achievements, recentActivity } = profileData;

  // Real-time Page display state
  const [userName, setUserName] = useState(profileData.user.name);
  const [userBio, setUserBio] = useState(profileData.user.bio || "");
  const [avatar, setAvatar] = useState(profileData.user.avatar);
  const [coverImage, setCoverImage] = useState(profileData.user.coverImage);
  const [skills, setSkills] = useState<string[]>(profileData.user.expertise || []);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalName, setModalName] = useState(userName);
  const [modalBio, setModalBio] = useState(userBio);
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
  const unlockedAchievements = achievements.filter((a) => a.unlocked);

  // Track which badge has its criteria panel expanded (null = all collapsed)
  const [expandedBadge, setExpandedBadge] = useState<string | null>(null);

  const toggleBadge = (name: string) => {
    setExpandedBadge((prev) => (prev === name ? null : name));
  };


  // Sync state when modal opens
  const openModal = () => {
    setModalName(userName);
    setModalBio(userBio);
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
      const response = await fetch("/api/student/profile", {
        method: "POST",
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
        setUserBio(modalBio);
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
        <Link href="/student">
          <Button variant="ghost" className="px-0 transition-colors" style={{ color: "var(--muted-foreground)" }}>
            Back to Dashboard
          </Button>
        </Link>
      </motion.div>

      {/* Profile Header */}
      <motion.div initial="hidden" animate="visible" variants={fadeTop} className="relative">
          <Card className="overflow-hidden rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}>
            {/* Cover Photo */}
            <div
              className="h-44 w-full bg-cover bg-center relative"
              style={coverImage ? { backgroundImage: `url(${coverImage})` } : {}}
            >
              {!coverImage && <div className="absolute inset-0" style={{ background: "var(--muted)" }} />}
            </div>

          <CardContent className="px-6 sm:px-8 pb-8 pt-0 relative">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16 mb-4">
              {/* Profile Picture */}
              <div className="relative shrink-0 z-10">
                <div className="w-32 h-32 rounded-full overflow-hidden flex items-center justify-center" style={{ boxShadow: "0 0 0 4px var(--card)", background: "var(--muted)" }}>
                  {avatar ? (
                    <img src={avatar} alt="Student Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <img
                      src={`https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(userName || profileData.user.email)}&backgroundColor=transparent`}
                      alt="Student Avatar"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>

              {/* Identity & Basic details */}
              <div className="flex-1 min-w-0 text-center md:text-left pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-center md:justify-start gap-3 mb-2">
                  <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>{userName}</h2>
                  <Badge variant="secondary" className="w-fit mx-auto sm:mx-0 text-[10px] font-semibold tracking-wider uppercase py-1 px-2.5 rounded-full" style={{ background: "var(--muted)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>
                    Student
                  </Badge>
                </div>

                <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
                  <span className="truncate">{profileData.user.email}</span>
                  <span>{org.name}</span>
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
                  Account Settings
                </Button>
              </div>
            </div>

            {/* Bio & Interests Section inside header wrapper */}
            {(userBio || skills.length > 0) && (
              <div className="mt-6 pt-6 flex flex-col gap-4 text-center md:text-left" style={{ borderTop: "1px solid var(--border)" }}>
                {userBio && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted-foreground)" }}>About Me</h4>
                    <p className="text-sm leading-relaxed max-w-2xl mx-auto md:mx-0" style={{ color: "var(--foreground)" }}>{userBio}</p>
                  </div>
                )}
                {skills.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)" }}>Interests & Skills</h4>
                    <div className="flex flex-wrap justify-center md:justify-start gap-2">
                      {skills.map((skill, idx) => (
                        <Badge key={idx} variant="secondary" className="px-3 py-1 text-xs rounded-full font-medium transition-colors" style={{ background: "var(--muted)", color: "var(--foreground)", border: "1px solid var(--border)" }}>
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

      {/* Main Content Grid */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeBottom}
        className="space-y-6"
      >
        {/* Achievements Card */}
        <Card className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>Achievements</h3>
              <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "var(--muted)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>
                {unlockedAchievements.length}/{achievements.length} Unlocked
              </span>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="p-6">
            {achievements.length === 0 ? (
              <div className="text-center py-8 text-sm" style={{ color: "var(--muted-foreground)" }}>
                Complete courses and quizzes to earn achievements!
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {achievements.map((badge, i) => {
                  const isExpanded = expandedBadge === badge.name;
                  return (
                    <div
                      key={i}
                      className="flex flex-col rounded-2xl border transition-all duration-300 overflow-hidden"
                      style={badge.unlocked
                        ? { borderColor: "var(--border)", background: "var(--card)", boxShadow: "var(--shadow-sm)" }
                        : { borderStyle: "dashed", borderColor: "var(--border)", background: "transparent", opacity: 0.45 }
                      }
                    >
                      {/* Badge body - grayscale/opacity applied here so it doesn't affect the chevron */}
                      <div className={`flex flex-col items-center p-4 pb-2 transition-all ${
                        !badge.unlocked ? "opacity-60 grayscale" : ""
                      }`}>
                        <div
                          className={`w-12 h-12 rounded-full bg-gradient-to-br ${badge.color} flex items-center justify-center shadow-sm mb-3 ${
                            badge.unlocked ? "ring-2 ring-white shadow-md" : ""
                          }`}
                        >
                          <span className="text-lg">{badge.icon}</span>
                        </div>
                        <p className="text-xs font-bold text-zinc-700 text-center truncate w-full leading-tight">
                          {badge.name}
                        </p>
                        {badge.unlocked ? (
                          <p className="text-[9px] text-emerald-600 mt-1 uppercase font-semibold tracking-wide">
                            Unlocked
                          </p>
                        ) : (
                          <p className="text-[9px] text-zinc-400 mt-1 uppercase font-semibold tracking-wide">
                            Locked
                          </p>
                        )}
                      </div>

                      {/* Chevron toggle button - fully opaque with high contrast */}
                      <button
                        type="button"
                        onClick={() => toggleBadge(badge.name)}
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? "Hide" : "Show"} criteria for ${badge.name}`}
                        className={`w-full flex items-center justify-center py-2.5 transition-all text-xs border-t border-zinc-100 ${
                          badge.unlocked
                            ? "text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/60 bg-indigo-50/10"
                            : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100/60 bg-zinc-100/10"
                        }`}
                      >
                        <ChevronDown
                          className={`w-4.5 h-4.5 transition-transform duration-300 shrink-0 ${
                            isExpanded ? "rotate-180 text-zinc-800" : "rotate-0"
                          }`}
                        />
                      </button>

                      {/* Criteria panel — smooth max-height animation */}
                      <div
                        className="overflow-hidden transition-all duration-300 ease-in-out"
                        style={{
                          maxHeight: isExpanded ? "120px" : "0px",
                          opacity: isExpanded ? 1 : 0,
                        }}
                      >
                        <div
                          className={`px-3 pb-3 pt-2 text-center border-t ${
                            badge.unlocked ? "border-indigo-100 bg-indigo-50/40" : "border-zinc-200 bg-zinc-100/40"
                          }`}
                        >
                          <p className="text-[10px] leading-snug font-semibold" style={{ color: "var(--foreground)" }}>
                            {badge.criteria ?? "Criteria not available."}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </CardContent>
        </Card>

        {/* Recent Activity Card */}
        <Card className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}>
          <CardHeader className="pb-4">
            <h3 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>Recent Activity</h3>
          </CardHeader>
          <Separator />
          <CardContent className="p-6 space-y-4">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-sm" style={{ color: "var(--muted-foreground)" }}>
                No recent activity yet. Start learning!
              </div>
            ) : (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-3 rounded-xl transition-colors" style={{ color: "var(--foreground)" }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-snug" style={{ color: "var(--foreground)" }}>{activity.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{activity.time}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Account Settings / Edit Profile Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity" style={{ background: "rgba(0,0,0,0.6)" }}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-3xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden"
            style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)" }}
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
                  style={modalCover ? { backgroundImage: `url(${modalCover})`, border: "1px solid var(--border)" } : { background: "var(--muted)", border: "1px solid var(--border)" }}
                >
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={uploadingCover}
                    className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    style={{ background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                  >
                    {uploadingCover ? <RingLoader size="sm" className="inline-flex" /> : null}
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
                        src={`https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(modalName || profileData.user.email)}&backgroundColor=transparent`}
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
                      {uploadingAvatar ? <RingLoader size="sm" className="inline-flex" /> : null}
                      Upload profile photo
                    </button>
                    {modalAvatar && (
                      <button
                        type="button"
                        onClick={() => setModalAvatar(null)}
                        className="font-semibold text-xs px-2.5 py-1.5 rounded-xl transition-colors"
                        style={{ color: "var(--accent)" }}
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
                  className="w-full rounded-xl px-4 py-2.5 text-sm transition-all font-medium"
                  style={{ background: "var(--secondary-background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
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
                  className="w-full rounded-xl px-4 py-2.5 text-sm transition-all font-medium resize-none"
                  style={{ background: "var(--secondary-background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
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
                    className="flex-1 rounded-xl px-4 py-2 text-sm transition-all"
                    style={{ background: "var(--secondary-background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
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
                      style={{ background: "var(--muted)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="p-0.5 rounded-full transition-colors"
                        style={{ color: "var(--muted-foreground)" }}
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
            <div className="px-6 py-4 flex justify-end gap-3 shrink-0" style={{ borderTop: "1px solid var(--border)", background: "var(--secondary-background)" }}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold"
                style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2"
                style={{ background: "var(--foreground)", color: "var(--background)" }}
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
