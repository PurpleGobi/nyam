import {
  SlidersHorizontal,
  Globe,
  BarChart3,
  Search,
  Filter,
  Sparkles,
  Code2,
} from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

const features = [
  {
    icon: SlidersHorizontal,
    title: "스마트 필터",
    description: "지역, 인원, 음식 종류, 분위기까지 세밀한 맞춤 추천",
  },
  {
    icon: Globe,
    title: "실시간 검증",
    description: "웹검색으로 영업 여부, 최신 리뷰를 확인해요",
  },
  {
    icon: BarChart3,
    title: "종합 평점",
    description: "네이버, 카카오, 구글 리뷰를 한눈에 비교",
  },
]

const steps = [
  {
    number: "1",
    title: "필터 설정",
    description: "지역, 인원수, 음식 종류 등 원하는 조건을 선택하세요",
    icon: Filter,
  },
  {
    number: "2",
    title: "AI 추천",
    description: "조건에 맞는 맛집을 웹검색 기반으로 찾아드려요",
    icon: Search,
  },
  {
    number: "3",
    title: "결과 확인",
    description: "평점, 메뉴, 리뷰를 확인하고 방문할 곳을 골라보세요",
    icon: Sparkles,
  },
]

export default function AboutPage() {
  return (
    <div className="px-4 py-6">
      {/* Hero */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-red-500">
          <Search className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">맛집</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          웹검색 기반 검증된 맛집 추천 서비스
        </p>
      </div>

      {/* Features */}
      <section className="mb-8">
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
          핵심 기능
        </h3>
        <div className="space-y-3">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader className="flex-row items-center gap-3 pb-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50">
                  <feature.icon className="h-5 w-5 text-orange-500" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-sm">{feature.title}</CardTitle>
                  <CardDescription className="text-xs">
                    {feature.description}
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <Separator className="mb-8" />

      {/* How to use */}
      <section className="mb-8">
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
          사용 방법
        </h3>
        <div className="relative space-y-6">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 h-full w-px bg-border" />
          {steps.map((step) => (
            <div key={step.number} className="relative flex gap-4">
              <div className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
                {step.number}
              </div>
              <div className="pt-1">
                <p className="text-sm font-medium text-foreground">
                  {step.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Separator className="mb-8" />

      {/* Credits */}
      <section className="text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Code2 className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">맛집 v1.0</p>
        <p className="mt-1 text-xs text-muted-foreground">
          AI 기반 맛집 추천 서비스
        </p>
      </section>
    </div>
  )
}
