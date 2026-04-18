import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const plans = [
  {
    name: "Starter",
    price: "$10",
    period: "/month",
    description: "Perfect for small scraping tasks and testing.",
    traffic: "1GB",
    features: [
      "Residential proxies",
      "Standard support",
      "Dashboard access",
      "Unlimited concurrency",
      "HTTP/SOCKS5 support"
    ]
  },
  {
    name: "Pro",
    price: "$40",
    period: "/month",
    description: "For teams scaling their automation workflows.",
    traffic: "5GB",
    popular: true,
    features: [
      "Residential + Datacenter",
      "Priority support",
      "API access",
      "City-level targeting",
      "Dedicated account manager",
      "Unlimited concurrency"
    ]
  },
  {
    name: "Business",
    price: "$120",
    period: "/month",
    description: "Enterprise-grade infrastructure for serious scale.",
    traffic: "20GB",
    features: [
      "Residential + Datacenter + Mobile",
      "24/7 Slack support",
      "Advanced API access",
      "Custom integration setup",
      "Whitelabel options",
      "SLA guarantee"
    ]
  }
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-background relative">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Transparent Pricing</h2>
          <p className="text-lg text-muted-foreground">
            Pay only for what you use. Top-tier proxy infrastructure without the enterprise markup.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative"
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <div className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-[0_0_10px_rgba(0,240,255,0.5)]">
                    Most Popular
                  </div>
                </div>
              )}
              <Card className={`h-full flex flex-col bg-card/40 backdrop-blur-md ${plan.popular ? 'border-primary shadow-[0_0_30px_rgba(0,240,255,0.1)]' : 'border-border/50'}`}>
                <CardHeader>
                  <CardTitle className="text-2xl text-white">{plan.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg mb-6 border border-border/50">
                    <div className="text-sm text-muted-foreground mb-1">Included Traffic</div>
                    <div className="text-lg font-semibold text-white">{plan.traffic}</div>
                  </div>
                  <ul className="space-y-3">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <Check className="w-5 h-5 text-primary shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className={`w-full ${plan.popular ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                    Buy Now
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
