import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  TrendingUp,
  CheckCircle2,
  Clock,
  Target,
  Eye,
  Lock,
  Briefcase,
  Trophy,
  Compass,
} from "lucide-react";
import type { StudentInsight } from "@/lib/foresatt/insight";

export function StudentInsightView({ insight }: { insight: StudentInsight }) {
  return (
    <>
      {/* Statistikk-kort */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Star className="h-6 w-6 text-yellow-500 mx-auto mb-2" aria-hidden="true" />
            <p className="text-2xl font-bold">{insight.xpTotal}</p>
            <p className="text-xs text-muted-foreground">XP opptjent</p>
            {insight.weeklyXpChange > 0 && (
              <p className="text-xs text-green-600 mt-1">+{insight.weeklyXpChange} denne uken</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <TrendingUp className="h-6 w-6 text-green-500 mx-auto mb-2" aria-hidden="true" />
            <p className="text-2xl font-bold">{insight.streak}</p>
            <p className="text-xs text-muted-foreground">Dagers streak</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Target className="h-6 w-6 text-blue-500 mx-auto mb-2" aria-hidden="true" />
            <p className="text-2xl font-bold">{insight.careersExplored}</p>
            <p className="text-xs text-muted-foreground">Karrierer utforsket</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-6 w-6 text-purple-500 mx-auto mb-2" aria-hidden="true" />
            <p className="text-2xl font-bold">{insight.achievementCount}</p>
            <p className="text-xs text-muted-foreground">Achievements</p>
          </CardContent>
        </Card>
      </div>

      {/* RIASEC-kategorier */}
      {insight.topRiasecCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Compass className="h-4 w-4" aria-hidden="true" />
              Interesseprofil
            </CardTitle>
            <CardDescription>
              Topp 3 interessekategorier basert på personlighetstest
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {insight.topRiasecCategories.map((category) => (
                <Badge key={category} variant="secondary" className="text-sm px-3 py-1">
                  {category}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Siste karrierer utforsket */}
      {insight.recentCareers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4" aria-hidden="true" />
              Siste karrierer utforsket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {insight.recentCareers.map((career) => (
                <Badge key={career} variant="outline" className="text-sm">
                  {career}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Siste achievements */}
      {insight.recentAchievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4" aria-hidden="true" />
              Siste achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {insight.recentAchievements.map((achievement) => (
                <Badge key={achievement} variant="secondary" className="text-sm">
                  {achievement}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fremdrift */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4" aria-hidden="true" />
            Fremdrift
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Onboarding</span>
              <span>{insight.onboardingStepsCompleted}/{insight.totalOnboardingSteps}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={insight.onboardingStepsCompleted} aria-valuemin={0} aria-valuemax={insight.totalOnboardingSteps} aria-label="Onboarding-fremdrift">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${(insight.onboardingStepsCompleted / insight.totalOnboardingSteps) * 100}%` }}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm">
              {insight.personalityTestComplete ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden="true" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              )}
              <span>Personlighetstest</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {insight.careersExplored > 0 ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden="true" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              )}
              <span>Karriereutforsking</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skjermet innhold */}
      <Card className="border-muted">
        <CardContent className="py-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              AI-samtaler, detaljerte personlighetsresultater og søknadsnotater
              er skjermet og ikke synlige for foresatte.
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
