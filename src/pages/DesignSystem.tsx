import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Copy, Palette, Type, Layout, MousePointer2, Settings, ExternalLink } from "lucide-react";

export default function DesignSystem() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8 md:p-12 space-y-16 animate-fade-in">
      {/* Header */}
      <section className="space-y-4 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Design System
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed">
          Guia de estilo e biblioteca de componentes padronizados para o ecossistema zapp-web.
          Foco em performance OLED, tipografia Inter e feedback visual neon.
        </p>
      </section>

      {/* Typography */}
      <section className="space-y-8">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <Type className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-semibold italic">Tipografia (Inter)</h2>
        </div>
        <Card variant="glass" padding="lg" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Headings</p>
              <h1 className="text-4xl font-bold">Heading 1 - 4xl Bold</h1>
              <h2 className="text-3xl font-semibold">Heading 2 - 3xl SemiBold</h2>
              <h3 className="text-2xl font-medium">Heading 3 - 2xl Medium</h3>
            </div>
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Body & Details</p>
              <p className="text-base">Body Base - Texto padrão para parágrafos e leitura longa.</p>
              <p className="text-sm text-muted-foreground">Body Small - Texto secundário ou descrições auxiliares.</p>
              <p className="text-xs font-mono bg-muted/30 p-2 rounded w-fit">Code - Mono font for technical data</p>
            </div>
          </div>
        </Card>
      </section>

      {/* Colors */}
      <section className="space-y-8">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <Palette className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-semibold italic">Cores & Tema OLED</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <ColorSwatch name="Background" hex="#000000" description="OLED Black Pure" />
          <ColorSwatch name="Primary" hex="hsl(var(--primary))" description="Electric Blue" className="bg-primary text-primary-foreground" />
          <ColorSwatch name="Secondary" hex="hsl(var(--secondary))" description="Neon Purple" className="bg-secondary text-secondary-foreground" />
          <ColorSwatch name="Accent" hex="hsl(var(--accent))" description="Soft Highlight" className="bg-accent text-accent-foreground" />
          <ColorSwatch name="Card" hex="hsl(var(--card))" description="OLED Surface" className="bg-card text-card-foreground border border-border" />
          <ColorSwatch name="Success" hex="hsl(var(--success))" description="Vibrant Green" className="bg-success text-success-foreground" />
          <ColorSwatch name="Destructive" hex="hsl(var(--destructive))" description="Urgent Red" className="bg-destructive text-destructive-foreground" />
        </div>
      </section>

      {/* Buttons */}
      <section className="space-y-8">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <MousePointer2 className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-semibold italic">Botões (Variants & Sizes)</h2>
        </div>
        <Card variant="glass" padding="lg" className="space-y-10">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Variants</h3>
            <div className="flex flex-wrap gap-4">
              <Button variant="default">Primary Button</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="whatsapp">WhatsApp</Button>
              <Button variant="glowPurple">Neon Purple</Button>
              <Button variant="link">Link Style</Button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Sizes & States</h3>
            <div className="flex flex-wrap items-center gap-4">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">Extra Large</Button>
              <Button isLoading>Loading State</Button>
              <Button disabled>Disabled</Button>
              <Button size="icon"><Settings className="w-4 h-4" /></Button>
            </div>
          </div>
        </Card>
      </section>

      {/* Inputs */}
      <section className="space-y-8">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <Layout className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-semibold italic">Inputs & Formulários</h2>
        </div>
        <Card variant="glass" padding="lg" className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <label className="text-sm font-medium">Default Input</label>
            <Input placeholder="Digite algo..." />
          </div>
          <div className="space-y-4">
            <label className="text-sm font-medium">Input with Icon</label>
            <Input leftIcon={Palette} placeholder="Selecione uma cor" />
          </div>
          <div className="space-y-4">
            <label className="text-sm font-medium">Neon Variant</label>
            <Input variant="neon" placeholder="Estilo neon..." />
          </div>
          <div className="space-y-4">
            <label className="text-sm font-medium">Error State</label>
            <Input error placeholder="Email inválido" defaultValue="contato@errado" />
          </div>
        </Card>
      </section>

      {/* Cards */}
      <section className="space-y-8 pb-12">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <Copy className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-semibold italic">Cards & Containers</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card padding="default">
            <CardHeader>
              <CardTitle>Default Card</CardTitle>
              <CardDescription>Borda simples e fundo sólido.</CardDescription>
            </CardHeader>
            <CardContent>
              Conteúdo padrão com espaçamento consistente.
            </CardContent>
          </Card>

          <Card variant="glass" padding="default">
            <CardHeader>
              <CardTitle>OLED Glass</CardTitle>
              <CardDescription>Efeito translúcido e blur.</CardDescription>
            </CardHeader>
            <CardContent>
              Ideal para sobrepor elementos em modo escuro.
            </CardContent>
          </Card>

          <Card variant="interactive" padding="default">
            <CardHeader>
              <CardTitle>Interactive Card</CardTitle>
              <CardDescription>Hover effect e cursor pointer.</CardDescription>
            </CardHeader>
            <CardContent>
              Sombra suave ao passar o mouse.
            </CardContent>
          </Card>
        </div>
      </section>
      
      <footer className="pt-12 border-t border-border flex justify-between items-center text-muted-foreground text-sm">
        <p>© 2026 zapp-web Design System</p>
        <div className="flex gap-4">
          <a href="#" className="hover:text-primary transition-colors flex items-center gap-1">Docs <ExternalLink className="w-3 h-3" /></a>
          <a href="#" className="hover:text-primary transition-colors flex items-center gap-1">GitHub <ExternalLink className="w-3 h-3" /></a>
        </div>
      </footer>
    </div>
  );
}

function ColorSwatch({ name, hex, description, className }: { name: string; hex: string; description: string; className?: string }) {
  return (
    <div className="space-y-2 group">
      <div className={`h-24 rounded-xl border border-border/50 shadow-sm transition-transform group-hover:scale-[1.02] ${className}`} />
      <div className="px-1">
        <p className="font-medium text-sm">{name}</p>
        <p className="text-xs text-muted-foreground font-mono">{hex}</p>
        <p className="text-[10px] text-muted-foreground italic mt-1">{description}</p>
      </div>
    </div>
  );
}
