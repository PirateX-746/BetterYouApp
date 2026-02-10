import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestUI() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>UI Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Email" />
          <Button className="w-full">Test Button</Button>
        </CardContent>
      </Card>
    </div>
  );
}
