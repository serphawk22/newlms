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
  Building2, Mail, Camera, Award, Loader, X, Plus, Flame, GraduationCap
} from "lucide-react";

interface Achievement {
  name: string;
  icon: string;
  color: string;
  unlocked: boolean;
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
                  <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">{userName}</h2>
                  <Badge variant="secondary" className="w-fit mx-auto sm:mx-0 text-[10px] bg-zinc-100 text-zinc-800 font-semibold tracking-wider uppercase py-1 px-2.5 rounded-full border border-zinc-200">
                    <GraduationCap className="w-3 h-3 mr-1" /> Student
                  </Badge>
                </div>

                <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 text-sm text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span className="truncate">{profileData.user.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>Campus Location</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>{org.name}</span>
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

            {/* Bio & Interests Section inside header wrapper */}
            {(userBio || skills.length > 0) && (
              <div className="mt-6 pt-6 border-t border-zinc-100 flex flex-col gap-4 text-center md:text-left">
                {userBio && (
                  <div>
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">About Me</h4>
                    <p className="text-zinc-600 text-sm leading-relaxed max-w-2xl mx-auto md:mx-0">{userBio}</p>
                  </div>
                )}
                {skills.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Interests & Skills</h4>
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

      {/* Main Content Grid */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeBottom}
        className="space-y-6"
      >
        {/* Achievements Card */}
        <Card className="border border-zinc-100 shadow-sm bg-white rounded-2xl overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" /> Achievements
              </h3>
              <span className="text-xs font-semibold text-zinc-500 bg-zinc-100 px-3 py-1 rounded-full border border-zinc-200">
                {unlockedAchievements.length}/{achievements.length} Unlocked
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                {achievements.map((badge, i) => (
                  <div
                    key={i}
                    className={`flex flex-col items-center p-4 rounded-2xl border transition-all duration-300 ${
                      badge.unlocked
                        ? "border-zinc-100 bg-zinc-50/50 hover:border-zinc-200 hover:bg-zinc-50 hover:shadow-sm"
                        : "border-dashed border-zinc-200 bg-zinc-50/30 opacity-40 grayscale"
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-full bg-gradient-to-br ${badge.color} flex items-center justify-center shadow-sm mb-3`}
                    >
                      <span className="text-lg">{badge.icon}</span>
                    </div>
                    <p className="text-xs font-bold text-zinc-700 text-center truncate w-full">{badge.name}</p>
                    {!badge.unlocked && <p className="text-[9px] text-zinc-400 mt-1 uppercase font-semibold">Locked</p>}
                    {badge.unlocked && <p className="text-[9px] text-emerald-600 mt-1 uppercase font-semibold">Unlocked</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Card - below Achievements */}
        <Card className="border border-zinc-100 shadow-sm bg-white rounded-2xl overflow-hidden">
          <CardHeader className="pb-4">
            <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-zinc-500" /> Recent Activity
            </h3>
          </CardHeader>
          <Separator className="bg-zinc-100" />
          <CardContent className="p-6 space-y-4">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-zinc-400 text-sm">
                <BookOpen className="w-10 h-10 mx-auto mb-3 text-zinc-300" />
                No recent activity yet. Start learning!
              </div>
            ) : (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-zinc-50/50 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <ActivityIcon type={activity.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-800 leading-snug">{activity.title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{activity.time}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Account Settings / Edit Profile Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm transition-opacity">
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
                      className="bg-white hover:bg-zinc-50 text-zinc-700 shadow-sm border border-zinc-200 px-3 py-1.5 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {uploadingAvatar ? <Loader className="w-3.5 h-3.5 animate-spin text-zinc-500" /> : <Camera className="w-3.5 h-3.5 text-zinc-500" />}
                      Upload profile photo
                    </button>
                    {modalAvatar && (
                      <button
                        type="button"
                        onClick={() => setModalAvatar(null)}
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
