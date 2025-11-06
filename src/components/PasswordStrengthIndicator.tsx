import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface StrengthResult {
  score: number;
  percentage: number;
  label: string;
  color: string;
  feedback: string[];
}

export const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const [strength, setStrength] = useState<StrengthResult>({
    score: 0,
    percentage: 0,
    label: "",
    color: "",
    feedback: []
  });

  useEffect(() => {
    if (!password) {
      setStrength({
        score: 0,
        percentage: 0,
        label: "",
        color: "",
        feedback: []
      });
      return;
    }

    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= 12) {
      score += 25;
    } else {
      feedback.push("At least 12 characters");
    }

    // Uppercase check
    if (/[A-Z]/.test(password)) {
      score += 25;
    } else {
      feedback.push("One uppercase letter");
    }

    // Lowercase check
    if (/[a-z]/.test(password)) {
      score += 25;
    } else {
      feedback.push("One lowercase letter");
    }

    // Number check
    if (/[0-9]/.test(password)) {
      score += 12.5;
    } else {
      feedback.push("One number");
    }

    // Special character check
    if (/[^A-Za-z0-9]/.test(password)) {
      score += 12.5;
    } else {
      feedback.push("One special character");
    }

    // Determine label and color based on score
    let label = "";
    let color = "";

    if (score < 50) {
      label = "Weak";
      color = "bg-destructive";
    } else if (score < 75) {
      label = "Fair";
      color = "bg-orange-500";
    } else if (score < 100) {
      label = "Good";
      color = "bg-yellow-500";
    } else {
      label = "Strong";
      color = "bg-green-500";
    }

    setStrength({
      score,
      percentage: score,
      label,
      color,
      feedback
    });
  }, [password]);

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Progress value={strength.percentage} className="h-2" />
        <span className="text-sm font-medium min-w-16">{strength.label}</span>
      </div>
      {strength.feedback.length > 0 && (
        <div className="text-xs text-muted-foreground">
          <span>Needs: </span>
          {strength.feedback.join(", ")}
        </div>
      )}
    </div>
  );
};
