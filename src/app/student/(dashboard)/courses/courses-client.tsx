"use client";

import { motion } from "framer-motion";
import { useState, useRef, useEffect } from "react";
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
  const [searchFocused, setSearchFocused] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

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
            className="w-full transition-colors"
            style={{ background: "#D9252A", color: "#FFFFFF" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#B21E22")}
            onMouseLeave={e => (e.currentTarget.style.background = "#D9252A")}
            onClick={() => router.push(`/student/courses/${course.id}`)}
          >
            Continue Learning
          </Button>
        );
      case "PENDING":
        return (
          <Button
            size="sm"
            className="w-full cursor-not-allowed"
            style={{
              background: "rgba(217, 37, 42, 0.12)",
              border: "1px solid rgba(217, 37, 42, 0.4)",
              color: "#FFFFFF",
            }}
            disabled
          >
            <Clock className="w-4 h-4 mr-1" style={{ color: "#FFFFFF" }} />
            Request Pending
          </Button>
        );
      case "REJECTED":
        return (
          <Button
            size="sm"
            className="w-full transition-colors"
            style={{
              background: "#343A40",
              border: "1px solid #5C6670",
              color: "#FFFFFF"
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#D9252A")}
            onMouseLeave={e => (e.currentTarget.style.background = "#343A40")}
            onClick={() => handleEnrollRequest(course.id)}
          >
            Request Again
          </Button>
        );
      default:
        return (
          <Button
            size="sm"
            className="w-full transition-colors"
            style={{
              background: "#343A40",
              border: "1px solid #5C6670",
              color: "#FFFFFF"
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#D9252A")}
            onMouseLeave={e => (e.currentTarget.style.background = "#343A40")}
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
            className="flex items-center gap-2 pb-3 border-b-2 transition-colors"
            style={
              activeTab === "all"
                ? { borderColor: "var(--foreground)", color: "var(--foreground)" }
                : { borderColor: "transparent", color: "var(--muted-foreground)" }
            }
            onMouseEnter={e => {
              if (activeTab !== "all") e.currentTarget.style.color = "var(--foreground)";
            }}
            onMouseLeave={e => {
              if (activeTab !== "all") e.currentTarget.style.color = "var(--muted-foreground)";
            }}
          >
            <BookOpen className="w-5 h-5" />
            <span className="font-medium">All Courses</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
            >
              {allCourses.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("my")}
            className="flex items-center gap-2 pb-3 border-b-2 transition-colors"
            style={
              activeTab === "my"
                ? { borderColor: "var(--foreground)", color: "var(--foreground)" }
                : { borderColor: "transparent", color: "var(--muted-foreground)" }
            }
            onMouseEnter={e => {
              if (activeTab !== "my") e.currentTarget.style.color = "var(--foreground)";
            }}
            onMouseLeave={e => {
              if (activeTab !== "my") e.currentTarget.style.color = "var(--muted-foreground)";
            }}
          >
            <BookMarked className="w-5 h-5" />
            <span className="font-medium">My Courses</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={{ background: "rgba(217, 37, 42, 0.12)", color: "#D9252A" }}
            >
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
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors"
                style={{ color: searchFocused ? "#D9252A" : "var(--muted-foreground)" }}
              />
              <Input
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="pl-9 transition-all focus-visible:ring-0 focus-visible:border-transparent outline-none"
                style={{
                  borderColor: searchFocused ? "#D9252A" : "#5C6670",
                  boxShadow: searchFocused ? "0 0 0 3px rgba(217, 37, 42, 0.2)" : "none",
                  background: "var(--input)",
                  color: "var(--foreground)",
                }}
              />
            </div>

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="px-3 py-2 border rounded-lg text-sm transition-all focus:outline-none flex items-center justify-between min-w-[160px]"
                style={{
                  background: "var(--card)",
                  color: "var(--foreground)",
                  borderColor: dropdownOpen ? "#D9252A" : "#5C6670",
                  boxShadow: dropdownOpen ? "0 0 0 2px rgba(217, 37, 42, 0.2)" : "none",
                }}
              >
                <span>
                  {selectedInstructor === "all" ? "All Instructors" : selectedInstructor}
                </span>
                <span className="ml-2 text-xs opacity-60">▼</span>
              </button>

              {dropdownOpen && (
                <div
                  className="absolute right-0 mt-1 w-full min-w-[200px] rounded-lg border shadow-lg z-50 py-1 overflow-hidden"
                  style={{
                    background: "var(--card)",
                    borderColor: "#5C6670",
                  }}
                >
                  <div
                    onClick={() => {
                      setSelectedInstructor("all");
                      setDropdownOpen(false);
                    }}
                    className="px-3 py-2 text-sm cursor-pointer transition-colors"
                    style={{
                      background: selectedInstructor === "all" ? "rgba(217, 37, 42, 0.15)" : "transparent",
                      borderLeft: selectedInstructor === "all" ? "3px solid #D9252A" : "3px solid transparent",
                      color: "var(--foreground)",
                    }}
                    onMouseEnter={e => {
                      if (selectedInstructor !== "all") {
                        e.currentTarget.style.background = "rgba(217, 37, 42, 0.08)";
                      }
                    }}
                    onMouseLeave={e => {
                      if (selectedInstructor !== "all") {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    All Instructors
                  </div>
                  {instructors.map((instructor) => {
                    const isSelected = selectedInstructor === instructor;
                    return (
                      <div
                        key={instructor}
                        onClick={() => {
                          setSelectedInstructor(instructor);
                          setDropdownOpen(false);
                        }}
                        className="px-3 py-2 text-sm cursor-pointer transition-colors"
                        style={{
                          background: isSelected ? "rgba(217, 37, 42, 0.15)" : "transparent",
                          borderLeft: isSelected ? "3px solid #D9252A" : "3px solid transparent",
                          color: "var(--foreground)",
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) {
                            e.currentTarget.style.background = "rgba(217, 37, 42, 0.08)";
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) {
                            e.currentTarget.style.background = "transparent";
                          }
                        }}
                      >
                        {instructor}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Courses Grid */}
          {filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCourses.map((course) => (
                <motion.div
                  key={course.id}
                  whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
                >
                  <Card
                    style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                    className="shadow-sm hover:shadow-md transition-shadow ring-0"
                  >
                    <CardHeader className="pb-3">
                      <CardTitle
                        className="text-base font-bold leading-tight"
                        style={{ color: "var(--foreground)" }}
                      >
                        {course.title}
                      </CardTitle>
                      {course.description && (
                        <p
                          className="text-xs mt-2 line-clamp-2"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {course.description}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div
                        className="flex items-center justify-between text-xs"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5" />
                          {course.modulesCount} modules
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {course.enrollmentsCount} students
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                        by {course.instructorName}
                      </p>
                      {getActionButton(course)}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <BookOpen />
              <p style={{ color: "var(--foreground)" }}>No courses found</p>
              <p className="text-sm mt-2" style={{ color: "var(--muted-foreground)" }}>
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      )}

      {/* My Courses Tab */}
      {activeTab === "my" && (
        <div className="space-y-6">
          {/* Active Courses */}
          <div className="space-y-3">
            <h2
              className="text-sm font-semibold flex items-center gap-2"
              style={{ color: "var(--foreground)" }}
            >
              <CheckCircle2 className="w-4 h-4" style={{ color: "#D9252A" }} />
              Active Courses ({activeCourses.length})
            </h2>
            {activeCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeCourses.map((course) => (
                  <motion.div
                    key={course.id}
                    whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
                  >
                    <Card
                      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                      className="shadow-sm ring-0"
                    >
                      <CardHeader className="pb-2">
                        <CardTitle
                          className="text-sm font-bold leading-tight"
                          style={{ color: "var(--foreground)" }}
                        >
                          {course.title}
                        </CardTitle>
                        {course.description && (
                          <p
                            className="text-xs mt-1 line-clamp-2"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            {course.description}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span style={{ color: "var(--muted-foreground)" }}>Progress</span>
                            <span
                              className="font-medium"
                              style={{ color: "var(--foreground)" }}
                            >
                              {course.progress}%
                            </span>
                          </div>
                          <div
                            className="w-full rounded-full h-1.5"
                            style={{ background: "var(--muted)" }}
                          >
                            <div
                              className="h-1.5 rounded-full transition-all"
                              style={{ width: `${course.progress}%`, background: "var(--foreground)" }}
                            />
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="w-full transition-colors"
                          style={{ background: "#D9252A", color: "#FFFFFF" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#B21E22")}
                          onMouseLeave={e => (e.currentTarget.style.background = "#D9252A")}
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
<<<<<<< HEAD
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-6 text-center text-sm text-zinc-500">
=======
              <div
                className="rounded-lg p-6 text-center text-sm"
                style={{
                  background: "var(--card)",
                  border: "1px dashed var(--border)",
                  color: "var(--muted-foreground)",
                }}
              >
>>>>>>> vaishnavi-ui
                You are not enrolled in any courses yet. Browse &quot;All Courses&quot; to request enrollment.
              </div>
            )}
          </div>

          {/* Pending Requests */}
          {pendingCourses.length > 0 && (
            <div className="space-y-3">
              <h2
                className="text-sm font-semibold flex items-center gap-2"
                style={{ color: "var(--foreground)" }}
              >
                <Clock className="w-4 h-4" style={{ color: "#D9252A" }} />
                Pending Requests ({pendingCourses.length})
              </h2>
              <div className="space-y-2">
                {pendingCourses.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <span className="text-sm" style={{ color: "var(--foreground)" }}>
                      {course.title}
                    </span>
                    <span
                      className="text-xs px-2 py-1 rounded-full"
                      style={{
                        background: "rgba(217, 37, 42, 0.12)",
                        border: "1px solid rgba(217, 37, 42, 0.4)",
                        color: "#FFFFFF",
                      }}
                    >
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
              <h2
                className="text-sm font-semibold flex items-center gap-2"
                style={{ color: "var(--foreground)" }}
              >
                <XCircle className="w-4 h-4" style={{ color: "#D9252A" }} />
                Not Accepted ({rejectedCourses.length})
              </h2>
              <div className="space-y-2">
                {rejectedCourses.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <span className="text-sm" style={{ color: "var(--foreground)" }}>
                      {course.title}
                    </span>
                    <Button
                      size="sm"
                      className="transition-colors"
                      style={{
                        background: "#343A40",
                        border: "1px solid #5C6670",
                        color: "#FFFFFF",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#D9252A")}
                      onMouseLeave={e => (e.currentTarget.style.background = "#343A40")}
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
