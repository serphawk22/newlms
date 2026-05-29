"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, CheckCircle2, Clock, XCircle, Search, Users, BookMarked } from "lucide-react";
import { Loader } from "@/components/ui/loader";

type CourseWithStatus = {
  id: string;
  title: string;
  description: string | null;
  instructorName: string;
  modulesCount: number;
  enrollmentsCount: number;
  enrollmentStatus: "PENDING" | "ACTIVE" | "REJECTED" | null;
  progress: number;
};

type ActiveCourse = {
  id: string;
  title: string;
  description: string | null;
  progress: number;
};

type PendingCourse = {
  id: string;
  title: string;
};

type StudentCoursesClientProps = {
  allCourses: CourseWithStatus[];
  activeCourses: ActiveCourse[];
  pendingCourses: PendingCourse[];
  rejectedCourses: PendingCourse[];
};

export default function StudentCoursesClient({
  allCourses,
  activeCourses,
  pendingCourses,
  rejectedCourses,
}: StudentCoursesClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"all" | "my">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
  const [selectedInstructor, setSelectedInstructor] = useState<string>("all");

  // Get unique instructors for filter
  const instructors = Array.from(new Set(allCourses.map(c => c.instructorName))).sort();

  // Filter courses by search and instructor
  const filteredCourses = allCourses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesInstructor = selectedInstructor === "all" || course.instructorName === selectedInstructor;
    return matchesSearch && matchesInstructor;
  });

  const handleEnrollRequest = async (courseId: string) => {
    setEnrollingCourseId(courseId);
    try {
      const res = await fetch("/api/student/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to submit request");
      }
    } catch (error) {
      console.error("Enrollment request failed:", error);
      alert("Failed to submit enrollment request");
    } finally {
      setEnrollingCourseId(null);
    }
  };

  const getActionButton = (course: CourseWithStatus) => {
    if (enrollingCourseId === course.id) {
      return (
        <Button size="sm" className="w-full" disabled>
          <Loader size="sm" variant="bars" />
          <span className="ml-2">Processing...</span>
        </Button>
      );
    }

    switch (course.enrollmentStatus) {
      case "ACTIVE":
        return (
          <Button
            size="sm"
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white"
            onClick={() => router.push(`/student/courses/${course.id}`)}
          >
            Continue Learning
          </Button>
        );
      case "PENDING":
        return (
          <Button size="sm" className="w-full bg-amber-100 text-amber-800 cursor-not-allowed" disabled>
            <Clock className="w-4 h-4 mr-1" />
            Request Pending
          </Button>
        );
      case "REJECTED":
        return (
          <Button
            size="sm"
            className="w-full border border-zinc-300 bg-white hover:bg-zinc-50"
            onClick={() => handleEnrollRequest(course.id)}
          >
            Request Again
          </Button>
        );
      default:
        return (
          <Button
            size="sm"
            className="w-full bg-zinc-900 text-white hover:bg-zinc-700"
            onClick={() => handleEnrollRequest(course.id)}
          >
            Request to Join
          </Button>
        );
    }
  };

  return (
    <div className="container-page space-y-6">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
              activeTab === "all"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-400 hover:text-zinc-600"
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="font-medium">All Courses</span>
            <span className="text-xs bg-zinc-100 px-2 py-0.5 rounded-full">{allCourses.length}</span>
          </button>
          <button
            onClick={() => setActiveTab("my")}
            className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
              activeTab === "my"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-400 hover:text-zinc-600"
            }`}
          >
            <BookMarked className="w-5 h-5" />
            <span className="font-medium">My Courses</span>
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
              {activeCourses.length}
            </span>
          </button>
        </div>
      </div>

      {/* All Courses Tab */}
      {activeTab === "all" && (
        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={selectedInstructor}
              onChange={(e) => setSelectedInstructor(e.target.value)}
              className="px-3 py-2 border border-zinc-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              <option value="all">All Instructors</option>
              {instructors.map(instructor => (
                <option key={instructor} value={instructor}>{instructor}</option>
              ))}
            </select>
          </div>

          {/* Courses Grid */}
          {filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCourses.map((course) => (
                <motion.div
                  key={course.id}
                  whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                >
                  <Card className="border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-bold text-zinc-900 leading-tight">
                        {course.title}
                      </CardTitle>
                      {course.description && (
                        <p className="text-xs text-zinc-500 mt-2 line-clamp-2">{course.description}</p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5" />
                          {course.modulesCount} modules
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {course.enrollmentsCount} students
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">by {course.instructorName}</p>
                      {getActionButton(course)}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <BookOpen />
              <p>No courses found</p>
              <p className="text-sm text-zinc-400 mt-2">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      )}

      {/* My Courses Tab */}
      {activeTab === "my" && (
        <div className="space-y-6">
          {/* Active Courses */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Active Courses ({activeCourses.length})
            </h2>
            {activeCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeCourses.map((course) => (
                  <motion.div
                    key={course.id}
                    whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  >
                    <Card className="border-emerald-200 bg-emerald-50/30 shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-zinc-900 leading-tight">
                          {course.title}
                        </CardTitle>
                        {course.description && (
                          <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{course.description}</p>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-500">Progress</span>
                            <span className="font-medium text-zinc-900">{course.progress}%</span>
                          </div>
                          <div className="w-full bg-zinc-200 rounded-full h-1.5">
                            <div
                              className="bg-emerald-600 h-1.5 rounded-full transition-all"
                              style={{ width: `${course.progress}%` }}
                            />
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="w-full bg-emerald-700 hover:bg-emerald-800 text-white"
                          onClick={() => router.push(`/student/courses/${course.id}`)}
                        >
                          Continue Learning
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-6 text-center text-sm text-zinc-500">
                You are not enrolled in any courses yet. Browse "All Courses" to request enrollment.
              </div>
            )}
          </div>

          {/* Pending Requests */}
          {pendingCourses.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                Pending Requests ({pendingCourses.length})
              </h2>
              <div className="space-y-2">
                {pendingCourses.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg"
                  >
                    <span className="text-sm text-zinc-900">{course.title}</span>
                    <span className="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                      Awaiting approval
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rejected Requests */}
          {rejectedCourses.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                Not Accepted ({rejectedCourses.length})
              </h2>
              <div className="space-y-2">
                {rejectedCourses.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <span className="text-sm text-zinc-900">{course.title}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEnrollRequest(course.id)}
                      disabled={enrollingCourseId === course.id}
                    >
                      {enrollingCourseId === course.id ? "Requesting..." : "Request Again"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
