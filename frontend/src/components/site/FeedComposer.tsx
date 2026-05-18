import React, { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  Globe2,
  Image as ImageIcon,
  Loader2,
  Play,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser, useIsLoggedIn } from "@/hooks/use-scope";
import { useImageSrc } from "@/hooks/use-image-src";
import { useRole } from "@/hooks/use-rbac";
import { backendFeed, backendInstitutions, backendUpload } from "@/lib/api/endpoints";
import { analytics } from "@/lib/analytics";
import { toast } from "sonner";

export function FeedComposer({ onPosted }: { onPosted?: () => void }) {
  const user = useUser();
  const avatar = useImageSrc(user?.avatarUrl);
  const isAuthed = useIsLoggedIn();
  const role = useRole();
  const isScopeAdmin = role === "scope_admin" || role === "super_admin";

  const [draft, setDraft] = useState("");
  const [targetInstitution, setTargetInstitution] = useState<string>("all");
  const [institutions, setInstitutions] = useState<Array<{ id: string; name: string }>>([]);
  const [media, setMedia] = useState<
    Array<{ type: "image" | "video"; url: string; fileId: string }>
  >([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isScopeAdmin) return;
    backendInstitutions
      .publicList()
      .then(({ items }) => setInstitutions(items))
      .catch(() => {});
  }, [isScopeAdmin]);

  if (!isAuthed) {
    return (
      <Card className="flex flex-wrap items-center justify-between gap-4 border-dashed bg-secondary/40 p-5">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-brand" />
          <div>
            <div className="text-sm font-semibold text-foreground">Sign in to post and react</div>
            <div className="text-xs text-muted-foreground">Earn XP for every action.</div>
          </div>
        </div>
        <Button asChild size="sm" className="bg-gradient-brand text-brand-foreground">
          <Link to="/auth">Join Scope</Link>
        </Button>
      </Card>
    );
  }

  const selectedInstitutionName =
    institutions.find((inst) => inst.id === targetInstitution)?.name ?? "the selected institution";
  const audienceLabel = isScopeAdmin
    ? targetInstitution === "all"
      ? "This post will reach every campus feed."
      : `This post will only reach ${selectedInstitutionName}.`
    : `This post will only reach your institution feed${user?.institution?.name ? ` at ${user.institution.name}` : ""}.`;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const type = file.type.startsWith("video/") ? "video" : "image";
      const { file: uploaded } = await backendUpload.upload(
        file,
        type === "image" ? "avatar" : "document",
      );
      setMedia((prev) => [...prev, { type, url: uploaded.url, fileId: uploaded.id }]);
    } catch {
      toast.error("Failed to upload media.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeMedia = (fileId: string) => {
    setMedia((prev) => prev.filter((item) => item.fileId !== fileId));
  };

  const submit = () => {
    if (!draft.trim() && media.length === 0) return;
    const target = isScopeAdmin && targetInstitution !== "all" ? targetInstitution : null;

    backendFeed
      .create(draft.trim(), "Update", target, media)
      .then(() => {
        analytics.track("feed_post_created", {
          media_count: media.length,
          audience: target ?? "global",
        } as any);
        setDraft("");
        setMedia([]);
        toast.success("Post published successfully.");
        onPosted?.();
      })
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : "Could not publish post"),
      );
  };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-brand-foreground ring-2 ring-white/10"
          style={{
            background: avatar.hasImage ? "transparent" : user?.avatarColor || "var(--brand)",
          }}
        >
          {avatar.hasImage ? (
            <img
              src={avatar.src}
              alt={user?.name || ""}
              className="h-full w-full object-cover"
              onError={avatar.onError}
            />
          ) : (
            (user?.name.charAt(0).toUpperCase() ?? "Y")
          )}
        </div>
        <div className="flex-1 space-y-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              isScopeAdmin
                ? "Share a global or institution-specific update..."
                : "Share an update with your institution..."
            }
            className="min-h-[80px] resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              {isScopeAdmin && targetInstitution === "all" ? (
                <Globe2 className="h-3 w-3" />
              ) : (
                <Building2 className="h-3 w-3" />
              )}
              {isScopeAdmin
                ? targetInstitution === "all"
                  ? "Global audience"
                  : selectedInstitutionName
                : (user?.institution?.name ?? "Institution audience")}
            </Badge>
            <span className="text-xs text-muted-foreground">{audienceLabel}</span>
          </div>

          {media.length > 0 && (
            <div className="flex flex-wrap gap-2 py-2">
              {media.map((item) => (
                <div
                  key={item.fileId}
                  className="group relative h-20 w-20 overflow-hidden rounded-lg border border-border bg-secondary"
                >
                  {item.type === "image" ? (
                    <img src={item.url} alt="Uploaded" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Play className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <button
                    onClick={() => removeMedia(item.fileId)}
                    className="absolute right-1 top-1 rounded-full bg-background/80 p-1 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3">
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,video/*"
                onChange={handleFileChange}
              />
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                type="button"
              >
                {isUploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ImageIcon className="mr-2 h-4 w-4" />
                )}
                {isUploading ? "Uploading..." : "Media"}
              </Button>

              {isScopeAdmin && (
                <Select value={targetInstitution} onValueChange={setTargetInstitution}>
                  <SelectTrigger className="h-8 w-[220px] border-dashed text-xs">
                    <SelectValue placeholder="Choose audience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Global (All Campuses)</SelectItem>
                    {institutions.map((inst) => (
                      <SelectItem key={inst.id} value={inst.id}>
                        {inst.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Button
              onClick={submit}
              size="sm"
              className="bg-gradient-brand text-brand-foreground"
              disabled={(!draft.trim() && media.length === 0) || isUploading}
              type="button"
            >
              <Send className="mr-2 h-4 w-4" /> Post
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
