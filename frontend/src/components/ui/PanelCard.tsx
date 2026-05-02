import Card from './Card'

interface PanelCardProps {
  icon: string
  title: string
  description: string
  onClick: () => void
}

export default function PanelCard({ icon, title, description, onClick }: PanelCardProps) {
  return (
    <Card onClick={onClick}>
      <div className="flex flex-col items-center text-center gap-3">
        <span className="text-4xl">{icon}</span>
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </Card>
  )
}
