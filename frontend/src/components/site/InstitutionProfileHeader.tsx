// 🏛️ InstitutionProfileHeader — Facebook-style profile header with cover photo and profile photo
// Features:
// - Large cover photo (1200x400px) with upload
// - Circular profile photo overlay (150x150px)
// - Edit buttons for both photos
// - Beautiful gradient fallbacks
// - Image cropping/positioning
// - Responsive design

import { useState, useRef, useEffect } from "react";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type InstitutionProfileHeaderProps = {
  institutionId: string;
  institutionName: string;
  coverPhotoUrl?: string;
  profilePhotoUrl?: string;
  onCoverPhotoChange?: (url: string) => void;
  onProfilePhotoChange?: (url: string) => void;
  isEditing?: boolean;
  isSaving?: boolean;
};

export function InstitutionProfileHeader({
  institutionId,
  institutionName,
  coverPhotoUrl,
  profilePhotoUrl,
  onCoverPhotoChange,
  onProfilePhotoChange,
  isEditing = false,
  isSaving = false,
}: InstitutionProfileHeaderProps) {
  const [showCoverDialog, setShowCoverDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [profileUploading, setProfileUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const coverCanvasRef = useRef<HTMLCanvasElement>(null);
  const profileCanvasRef = useRef<HTMLCanvasElement>(null);

  // Handle cover photo selection
  const handleCoverPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setCoverPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle profile photo selection
  const handleProfilePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setProfilePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Save cover photo
  const saveCoverPhoto = async () => {
    if (!coverPreview) return;

    setCoverUploading(true);
    try {
      // In a real app, you would upload to a backend/storage service
      // For now, we'll use the data URL directly
      onCoverPhotoChange?.(coverPreview);
      setShowCoverDialog(false);
      setCoverPreview(null);
      toast.success("Cover photo updated successfully!");
    } catch (error) {
      console.error("Failed to upload cover photo:", error);
      toast.error("Failed to upload cover photo");
    } finally {
      setCoverUploading(false);
    }
  };

  // Save profile photo
  const saveProfilePhoto = async () => {
    if (!profilePreview) return;

    setProfileUploading(true);
    try {
      // In a real app, you would upload to a backend/storage service
      // For now, we'll use the data URL directly
      onProfilePhotoChange?.(profilePreview);
      setShowProfileDialog(false);
      setProfilePreview(null);
      toast.success("Profile photo updated successfully!");
    } catch (error) {
      console.error("Failed to upload profile photo:", error);
      toast.error("Failed to upload profile photo");
    } finally {
      setProfileUploading(false);
    }
  };

  // Get initials for fallback
  const initials = institutionName
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  // Gradient colors for fallback
  const gradientColors = [
    "from-blue-500 to-blue-600",
    "from-purple-500 to-purple-600",
    "from-pink-500 to-pink-600",
    "from-green-500 to-green-600",
    "from-orange-500 to-orange-600",
  ];
  const gradientIndex = institutionId.charCodeAt(0) % gradientColors.length;
  const gradientClass = gradientColors[gradientIndex];

  return (
    <div className="relative w-full">
      {/* Cover Photo Section */}
      <div className="relative h-48 w-full overflow-visible rounded-lg bg-gradient-to-br shadow-lg">
        <div className="relative h-48 w-full overflow-hidden rounded-lg">
          {coverPhotoUrl ? (
            <img
              src={coverPhotoUrl}
              alt="Institution cover"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className={cn("h-full w-full bg-gradient-to-br", gradientClass)} />
          )}

          {/* Cover Photo Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

          {/* Edit Cover Button */}
          {isEditing && (
            <button
              onClick={() => setShowCoverDialog(true)}
              className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-white transition-all hover:bg-black/70"
            >
              <Camera className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Edit Cover</span>
            </button>
          )}
        </div>

        {/* Profile Photo - Positioned Over Cover (outside overflow container) */}
        <div className="absolute -bottom-12 left-4 z-10">
          <div className="relative">
            {/* Profile Photo Circle */}
            <div className="h-24 w-24 overflow-hidden rounded-full border-3 border-white shadow-xl bg-gradient-to-br from-gray-200 to-gray-300 ring-2 ring-background">
              {profilePhotoUrl ? (
                <img
                  src={profilePhotoUrl}
                  alt="Institution profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className={cn("h-full w-full flex items-center justify-center bg-gradient-to-br text-white text-3xl font-bold", gradientClass)}>
                  {initials}
                </div>
              )}
            </div>

            {/* Edit Profile Photo Button - positioned relative to profile photo */}
            {isEditing && (
              <button
                onClick={() => setShowProfileDialog(true)}
                className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-all hover:bg-blue-700 border-2 border-white"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Spacer for Profile Photo */}
      <div className="h-14" />

      {/* Cover Photo Upload Dialog */}
      <Dialog open={showCoverDialog} onOpenChange={setShowCoverDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Cover Photo</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Preview */}
            {coverPreview ? (
              <div className="relative h-64 w-full overflow-hidden rounded-lg bg-gray-100">
                <img
                  src={coverPreview}
                  alt="Cover preview"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-64 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">Select a cover photo to preview</p>
                </div>
              </div>
            )}

            {/* File Input */}
            <div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverPhotoSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => coverInputRef.current?.click()}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                Choose Cover Photo
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Recommended: 1200x400px, JPG or PNG, max 5MB
              </p>
            </div>

            {/* Info */}
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-sm text-blue-900">
                💡 <strong>Tip:</strong> Use a high-quality image that represents your institution. Landscape orientation works best.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCoverDialog(false);
                setCoverPreview(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={saveCoverPhoto}
              disabled={!coverPreview || coverUploading}
            >
              {coverUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Save Cover Photo"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Photo Upload Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Profile Photo</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Preview */}
            {profilePreview ? (
              <div className="relative h-64 w-64 mx-auto overflow-hidden rounded-full bg-gray-100 border-4 border-gray-200">
                <img
                  src={profilePreview}
                  alt="Profile preview"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-64 w-64 mx-auto items-center justify-center rounded-full border-4 border-dashed border-gray-300 bg-gray-50">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">Select a photo</p>
                </div>
              </div>
            )}

            {/* File Input */}
            <div>
              <input
                ref={profileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfilePhotoSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => profileInputRef.current?.click()}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                Choose Profile Photo
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Recommended: Square image, JPG or PNG, max 5MB
              </p>
            </div>

            {/* Info */}
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-sm text-blue-900">
                💡 <strong>Tip:</strong> Use your institution's logo or a representative image. It will be displayed as a circle.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowProfileDialog(false);
                setProfilePreview(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={saveProfilePhoto}
              disabled={!profilePreview || profileUploading}
            >
              {profileUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Save Profile Photo"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
