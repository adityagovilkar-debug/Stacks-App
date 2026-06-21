"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sun, Moon, Type, Target, MapPin, Tags, FolderHeart, LogOut } from "lucide-react";
import { LocationManager } from "@/components/LocationManager";
import { TagManager } from "@/components/TagManager";
import { CollectionManager } from "@/components/CollectionManager";
import { useProfile, useUpdateProfile } from "@/lib/queries";
import { supabaseBrowser } from "@/lib/supabase/browser";
import {
  getTheme,
  getTextSize,
  setTheme,
  setTextSize,
  type TextSize,
  type Theme,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-extrabold">
        {icon} {title}
      </h2>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  const [theme, setThemeState] = useState<Theme>("light");
  const [size, setSizeState] = useState<TextSize>("normal");
  const [name, setName] = useState("");
  const [goals, setGoals] = useState({ books: 24, pages: 25, minutes: 20 });

  useEffect(() => {
    setThemeState(getTheme());
    setSizeState(getTextSize());
  }, []);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name ?? "");
      setGoals({
        books: profile.goal_books_per_year,
        pages: profile.goal_pages_per_day,
        minutes: profile.goal_minutes_per_day,
      });
    }
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function pickTheme(t: Theme) {
    setTheme(t);
    setThemeState(t);
  }
  function pickSize(s: TextSize) {
    setTextSize(s);
    setSizeState(s);
  }
  function saveGoals() {
    updateProfile.mutate(
      {
        goal_books_per_year: goals.books,
        goal_pages_per_day: goals.pages,
        goal_minutes_per_day: goals.minutes,
      },
      { onSuccess: () => toast.success("Goals saved") },
    );
  }
  function saveName() {
    updateProfile.mutate(
      { full_name: name.trim() || null },
      { onSuccess: () => toast.success("Saved") },
    );
  }
  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold misreg">Settings</h1>
      </header>

      <Card icon={<Target className="h-5 w-5 text-riso-blue" />} title="Reading goals">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Books / year</label>
            <input
              className="input"
              type="number"
              value={goals.books}
              onChange={(e) => setGoals({ ...goals, books: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label">Pages / day</label>
            <input
              className="input"
              type="number"
              value={goals.pages}
              onChange={(e) => setGoals({ ...goals, pages: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label">Minutes / day</label>
            <input
              className="input"
              type="number"
              value={goals.minutes}
              onChange={(e) => setGoals({ ...goals, minutes: Number(e.target.value) })}
            />
          </div>
        </div>
        <button className="btn-primary mt-4" onClick={saveGoals}>
          Save goals
        </button>
      </Card>

      <Card icon={<Sun className="h-5 w-5 text-riso-orange" />} title="Appearance">
        <div className="space-y-4">
          <div>
            <div className="label">Theme</div>
            <div className="inline-flex rounded-xl border-2 border-outline bg-surface-2 p-1">
              {([
                { key: "light", label: "Light", icon: Sun },
                { key: "dark", label: "Dark", icon: Moon },
              ] as const).map((t) => (
                <button
                  key={t.key}
                  onClick={() => pickTheme(t.key)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-4 py-2 font-bold transition",
                    theme === t.key ? "bg-riso-blue text-white" : "text-text-muted",
                  )}
                >
                  <t.icon className="h-4 w-4" /> {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="label flex items-center gap-1.5">
              <Type className="h-4 w-4" /> Text size
            </div>
            <div className="inline-flex rounded-xl border-2 border-outline bg-surface-2 p-1">
              {([
                { key: "normal", label: "Normal" },
                { key: "large", label: "Large" },
                { key: "xlarge", label: "Larger" },
              ] as const).map((s) => (
                <button
                  key={s.key}
                  onClick={() => pickSize(s.key)}
                  className={cn(
                    "rounded-lg px-4 py-2 font-bold transition",
                    size === s.key ? "bg-riso-blue text-white" : "text-text-muted",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card icon={<MapPin className="h-5 w-5 text-riso-blue" />} title="Locations">
        <p className="mb-3 text-sm text-text-muted">
          Build out where books live — rooms, shelves, even rows. Nest them as
          deep as you like.
        </p>
        <LocationManager />
      </Card>

      <Card icon={<Tags className="h-5 w-5 text-riso-purple" />} title="Tags & genres">
        <p className="mb-3 text-sm text-text-muted">
          Classify books by genre, mood, theme, or any free-form tag.
        </p>
        <TagManager />
      </Card>

      <Card icon={<FolderHeart className="h-5 w-5 text-riso-pink" />} title="Collections">
        <p className="mb-3 text-sm text-text-muted">
          Your own shelves — group books however you please.
        </p>
        <CollectionManager />
      </Card>

      <Card icon={<LogOut className="h-5 w-5" />} title="Account">
        <div className="space-y-3">
          <div>
            <label className="label">Your name</label>
            <div className="flex gap-2">
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button className="btn-outline shrink-0" onClick={saveName}>
                Save
              </button>
            </div>
          </div>
          {profile?.email && (
            <p className="text-sm text-text-muted">
              Signed in as <b className="text-text">{profile.email}</b>
            </p>
          )}
          <button className="btn-danger" onClick={signOut}>
            <LogOut className="h-5 w-5" /> Sign out
          </button>
        </div>
      </Card>
    </div>
  );
}
