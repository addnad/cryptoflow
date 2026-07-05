"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Screen, staggerContainer, staggerItem } from "@/components/Screen";
import { TopBar } from "@/components/TopBar";
import { Toggle } from "@/components/Toggle";
import { Slider } from "@/components/Slider";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { useSettings } from "@/stores/settings";
import type { GraphicsQuality } from "@/types";
import { haptic } from "@/lib/native";

const QUALITIES: { id: GraphicsQuality; label: string }[] = [
  { id: "high", label: "High" },
  { id: "balanced", label: "Balanced" },
  { id: "battery", label: "Battery" },
];

export function SettingsScreen({ direction }: { direction: 1 | -1 }) {
  const s = useSettings();
  const [privacyOpen, setPrivacyOpen] = useState(false);

  return (
    <Screen direction={direction}>
      <TopBar title="Settings" />
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 pb-safe pt-4"
      >
        <Section title="Audio">
          <Row label="Music">
            <Slider
              label="Music volume"
              value={s.musicVolume}
              onChange={s.setMusicVolume}
            />
          </Row>
          <Row label="Sound effects">
            <Slider
              label="Sound effects volume"
              value={s.sfxVolume}
              onChange={s.setSfxVolume}
            />
          </Row>
        </Section>

        <Section title="Feel">
          <Row label="Haptics">
            <Toggle on={s.haptics} onChange={s.setHaptics} label="Haptics" />
          </Row>
          <Row label="Graphics">
            <div className="flex rounded-xl border border-line bg-surface p-1">
              {QUALITIES.map((q) => (
                <button
                  key={q.id}
                  onClick={() => {
                    void haptic("light");
                    s.setGraphics(q.id);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors duration-200 ${
                    s.graphics === q.id
                      ? "bg-surface-high text-snow"
                      : "text-fog-dim"
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </Row>
        </Section>

        <Section title="General">
          <Row label="Notifications">
            <Toggle
              on={s.notifications}
              onChange={s.setNotifications}
              label="Notifications"
            />
          </Row>
          <Row label="Language">
            <span className="text-body text-fog">English</span>
          </Row>
          <button
            onClick={() => setPrivacyOpen(true)}
            className="flex h-[52px] items-center justify-between"
          >
            <span className="text-body font-medium text-snow">Privacy</span>
            <span className="text-body text-fog-dim">View</span>
          </button>
        </Section>
      </motion.div>

      <Modal open={privacyOpen} onClose={() => setPrivacyOpen(false)}>
        <h3 className="text-title mb-3 text-snow">Privacy</h3>
        <p className="text-body mb-3 text-fog">
          Crypto Flow stores your profile, scores and achievements to run
          leaderboards and sync progress. Guest data stays on this device
          until you link an account.
        </p>
        <p className="text-body mb-6 text-fog">
          No ads, no trackers, no selling data. The market is hostile enough.
        </p>
        <div className="pb-6">
          <Button block onClick={() => setPrivacyOpen(false)}>
            Done
          </Button>
        </div>
      </Modal>
    </Screen>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section variants={staggerItem}>
      <h2 className="text-caption mb-1 px-1 text-fog-dim">{title}</h2>
      <div className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-ink-raised px-5">
        {children}
      </div>
    </motion.section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[56px] items-center justify-between py-2">
      <span className="text-body font-medium text-snow">{label}</span>
      {children}
    </div>
  );
}
