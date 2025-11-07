import { useState, useEffect, useRef } from "react";
import { Pencil, Upload, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import kanjiLogo from "@/assets/kanji-logo.png";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const LogoUpload = () => {
  const [logoUrl, setLogoUrl] = useState<string>(kanjiLogo);
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { role } = useUserRole();

  const canEdit = role === "admin" || role === "super_admin";
  const hasCustomLogo = customLogoUrl !== null;

  useEffect(() => {
    fetchLogo();
  }, []);

  const fetchLogo = async () => {
    const { data, error } = await supabase
      .from("app_settings")
      .select("logo_url")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching logo:", error);
      return;
    }

    if (data?.logo_url) {
      setLogoUrl(data.logo_url);
      setCustomLogoUrl(data.logo_url);
    } else {
      setLogoUrl(kanjiLogo);
      setCustomLogoUrl(null);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to upload a logo");
        return;
      }

      // Upload to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("logos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("logos")
        .getPublicUrl(fileName);

      // Update database
      const { data: settings } = await supabase
        .from("app_settings")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (settings) {
        const { error: updateError } = await supabase
          .from("app_settings")
          .update({ 
            logo_url: publicUrl,
            updated_at: new Date().toISOString(),
            updated_by: user.id 
          })
          .eq("id", settings.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("app_settings")
          .insert({ 
            logo_url: publicUrl,
            updated_by: user.id 
          });

        if (insertError) throw insertError;
      }

      setLogoUrl(publicUrl);
      setCustomLogoUrl(publicUrl);
      toast.success("Logo updated successfully");
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Failed to upload logo");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteLogo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to delete the logo");
        return;
      }

      // Update database to remove logo URL
      const { data: settings } = await supabase
        .from("app_settings")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (settings) {
        const { error: updateError } = await supabase
          .from("app_settings")
          .update({ 
            logo_url: null,
            updated_at: new Date().toISOString(),
            updated_by: user.id 
          })
          .eq("id", settings.id);

        if (updateError) throw updateError;
      }

      setLogoUrl(kanjiLogo);
      setCustomLogoUrl(null);
      setShowDeleteDialog(false);
      toast.success("Logo deleted, reverted to default");
    } catch (error) {
      console.error("Error deleting logo:", error);
      toast.error("Failed to delete logo");
    }
  };

  const handleClick = () => {
    if (canEdit && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <>
      <div
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div 
          className={`p-1 rounded-lg bg-white shadow-sm transition-opacity`}
        >
          <img 
            src={logoUrl} 
            alt="Kanji AI Apps" 
            className="h-28 w-28 object-contain" 
          />
          
          {canEdit && isHovered && !isUploading && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center gap-4">
              <div
                className="cursor-pointer hover:scale-110 transition-transform"
                onClick={handleClick}
                title="Change logo"
              >
                <Pencil className="h-8 w-8 text-white" />
              </div>
              {hasCustomLogo && (
                <div
                  className="cursor-pointer hover:scale-110 transition-transform"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteDialog(true);
                  }}
                  title="Delete logo and revert to default"
                >
                  <Trash2 className="h-8 w-8 text-white hover:text-destructive" />
                </div>
              )}
            </div>
          )}

          {isUploading && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
              <Upload className="h-8 w-8 text-white animate-pulse" />
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
          disabled={!canEdit || isUploading}
        />
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Logo?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the custom logo and revert to the default logo. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLogo} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};