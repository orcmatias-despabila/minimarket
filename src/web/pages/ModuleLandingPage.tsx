import { ModulePlaceholder } from '../../shared/components/ModulePlaceholder'

interface ModuleLandingPageProps {
  title: string
  summary: string
  goals: string[]
  entities: string[]
  nextSteps: string[]
}

export function ModuleLandingPage(props: ModuleLandingPageProps) {
  return <ModulePlaceholder {...props} />
}
