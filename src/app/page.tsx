"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Users, UtensilsCrossed, Heart, Wallet, Sparkles, Car, CalendarCheck, Clock, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { FilterState } from "@/types";
import { recommendRestaurants, saveResultsToSession } from "@/lib/api";

const FILTER_DATA = {
  areas: ["강남", "홍대", "종로", "이태원", "성수", "여의도", "잠실", "신촌", "압구정", "을지로"],
  partySize: [
    { value: "1", label: "1명 (혼밥)" },
    { value: "2-4", label: "2~4명" },
    { value: "5-10", label: "5~10명" },
    { value: "10+", label: "10명+" },
  ],
  cuisines: ["한식", "중식", "일식", "양식", "동남아", "카페", "술집/바"],
  occasions: ["데이트", "비즈니스", "가족모임", "친구모임", "혼밥", "회식", "기념일"],
  priceRange: ["1만원 이하", "1~3만원", "3~5만원", "5만원+"],
  moods: ["조용한", "활기찬", "프라이빗", "뷰맛집", "감성적"],
} as const;

const initialFilters: FilterState = {
  areas: [],
  partySize: "",
  cuisines: [],
  occasions: [],
  priceRange: [],
  moods: [],
  options: { parking: false, reservation: false, noWaiting: false },
};

function ChipGroup({
  items,
  selected,
  onToggle,
  single,
}: {
  items: readonly (string | { value: string; label: string })[];
  selected: string | string[];
  onToggle: (value: string) => void;
  single?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const value = typeof item === "string" ? item : item.value;
        const label = typeof item === "string" ? item : item.label;
        const isSelected = single
          ? selected === value
          : (selected as string[]).includes(value);

        return (
          <button
            key={value}
            type="button"
            onClick={() => onToggle(value)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              isSelected
                ? "border-orange-500 bg-orange-500 text-white"
                : "border-border bg-background text-foreground hover:border-orange-300 hover:bg-orange-50"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleMulti = (key: keyof Pick<FilterState, "areas" | "cuisines" | "occasions" | "priceRange" | "moods">) => (value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v) => v !== value)
        : [...prev[key], value],
    }));
  };

  const toggleSingle = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      partySize: prev.partySize === value ? "" : value,
    }));
  };

  const toggleOption = (key: keyof FilterState["options"]) => {
    setFilters((prev) => ({
      ...prev,
      options: { ...prev.options, [key]: !prev.options[key] },
    }));
  };

  const hasSelection =
    filters.areas.length > 0 ||
    filters.partySize !== "" ||
    filters.cuisines.length > 0 ||
    filters.occasions.length > 0 ||
    filters.priceRange.length > 0 ||
    filters.moods.length > 0;

  const handleRecommend = async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await recommendRestaurants(filters);
      saveResultsToSession(results);
      router.push("/results");
    } catch {
      setError("맛집 추천에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 p-4">
      <FilterCard icon={MapPin} title="지역">
        <ChipGroup
          items={FILTER_DATA.areas}
          selected={filters.areas}
          onToggle={toggleMulti("areas")}
        />
      </FilterCard>

      <FilterCard icon={Users} title="인원수">
        <ChipGroup
          items={FILTER_DATA.partySize}
          selected={filters.partySize}
          onToggle={toggleSingle}
          single
        />
      </FilterCard>

      <FilterCard icon={UtensilsCrossed} title="음식 종류">
        <ChipGroup
          items={FILTER_DATA.cuisines}
          selected={filters.cuisines}
          onToggle={toggleMulti("cuisines")}
        />
      </FilterCard>

      <FilterCard icon={Heart} title="Occasion">
        <ChipGroup
          items={FILTER_DATA.occasions}
          selected={filters.occasions}
          onToggle={toggleMulti("occasions")}
        />
      </FilterCard>

      <FilterCard icon={Wallet} title="가격대">
        <ChipGroup
          items={FILTER_DATA.priceRange}
          selected={filters.priceRange}
          onToggle={toggleMulti("priceRange")}
        />
      </FilterCard>

      <FilterCard icon={Sparkles} title="분위기">
        <ChipGroup
          items={FILTER_DATA.moods}
          selected={filters.moods}
          onToggle={toggleMulti("moods")}
        />
      </FilterCard>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Car className="size-4 text-orange-500" />
            추가 옵션
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <OptionRow
            checked={filters.options.parking}
            onToggle={() => toggleOption("parking")}
            icon={Car}
            label="주차 가능"
          />
          <OptionRow
            checked={filters.options.reservation}
            onToggle={() => toggleOption("reservation")}
            icon={CalendarCheck}
            label="예약 가능"
          />
          <OptionRow
            checked={filters.options.noWaiting}
            onToggle={() => toggleOption("noWaiting")}
            icon={Clock}
            label="웨이팅 없는 곳"
          />
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="sticky bottom-16 pt-2 pb-2">
        <Button
          className="h-12 w-full rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-base font-semibold text-white shadow-lg hover:from-orange-600 hover:to-red-600"
          disabled={!hasSelection || loading}
          onClick={handleRecommend}
        >
          {loading ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              맛집을 찾고 있습니다...
            </>
          ) : (
            <>
              맛집 추천받기
              <ChevronRight className="size-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function FilterCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-orange-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function OptionRow({
  checked,
  onToggle,
  icon: Icon,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <Checkbox checked={checked} onCheckedChange={onToggle} />
      <Icon className="size-4 text-muted-foreground" />
      <span className="text-sm">{label}</span>
    </label>
  );
}
