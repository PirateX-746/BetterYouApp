"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Calendar, User } from "lucide-react";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      {/* ================= PROFILE HEADER ================= */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-24" />

        <CardContent className="p-6 -mt-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
                <AvatarFallback className="text-2xl">KT</AvatarFallback>
              </Avatar>

              <div>
                <h2 className="text-2xl font-bold">Keyur Thakkar</h2>
                <p className="text-muted-foreground">keyur@email.com</p>
              </div>
            </div>

            <Button variant="outline">Edit Profile</Button>
          </div>
        </CardContent>
      </Card>

      {/* ================= PERSONAL INFORMATION ================= */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>

        <CardContent className="grid sm:grid-cols-2 gap-6">
          <InfoItem icon={Phone} label="Phone" value="+91 9876543210" />

          <InfoItem icon={User} label="Gender" value="Male" />

          <InfoItem
            icon={Calendar}
            label="Date of Birth"
            value="January 1, 2000"
          />

          <InfoItem icon={Mail} label="Email Address" value="keyur@email.com" />
        </CardContent>
      </Card>

      {/* ================= MEDICAL INFORMATION ================= */}
      <Card>
        <CardHeader>
          <CardTitle>Medical Details</CardTitle>
        </CardHeader>

        <CardContent className="grid sm:grid-cols-2 gap-6">
          <DetailItem label="Blood Group" value="B+" />
          <DetailItem label="Age" value="24 Years" />
          <DetailItem label="Allergies" value="None Reported" />
          <DetailItem label="Chronic Conditions" value="N/A" />
        </CardContent>
      </Card>

      {/* ================= ACCOUNT DETAILS ================= */}
      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>

        <CardContent className="grid sm:grid-cols-2 gap-6">
          <DetailItem label="Member Since" value="Feb 2025" />
          <DetailItem label="Last Login" value="Today at 10:30 AM" />
        </CardContent>
      </Card>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-5 h-5 text-blue-600 mt-1" />
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
