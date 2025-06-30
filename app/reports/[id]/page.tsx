"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Download, Printer as Print, Calendar, MapPin, User, AlertTriangle, CheckCircle, XCircle, Clock, Camera } from 'lucide-react';
import Link from 'next/link';
import { InspectionData } from '@/lib/inspection-data';
import { toast } from 'sonner';

export default function ReportDetailPage() {
  const params = useParams();
  const inspectionId = params.id as string;
  const [inspection, setInspection] = useState<InspectionData | null>(null);

  useEffect(() => {
    // Load specific inspection from localStorage
    const savedInspections = JSON.parse(localStorage.getItem('theater-inspections') || '[]');
    const foundInspection = savedInspections.find((insp: InspectionData) => insp.id === inspectionId);
    setInspection(foundInspection || null);
  }, [inspectionId]);

  if (!inspection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white flex items-center justify-center">
        <Card className="p-8 text-center bg-gray-800/50 border-purple-500/30">
          <h2 className="text-xl font-bold mb-4">Inspection Not Found</h2>
          <p className="text-gray-300 mb-6">The requested inspection report could not be found.</p>
          <Link href="/reports">
            <Button className="bg-purple-600 hover:bg-purple-700">
              Back to Reports
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'good': return 'text-green-500';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const getConditionIcon = (condition: string) => {
    switch (condition) {
      case 'good': return <CheckCircle className="w-4 h-4" />;
      case 'fair': return <AlertTriangle className="w-4 h-4" />;
      case 'poor': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getSummaryStats = () => {
    const stats = {
      total: 0,
      good: 0,
      fair: 0,
      poor: 0,
      notInspected: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    inspection.categories.forEach(category => {
      category.items.forEach(item => {
        stats.total++;
        stats[item.condition.replace('-', '') as keyof typeof stats]++;
        stats[item.priority as keyof typeof stats]++;
      });
    });

    return stats;
  };

  const stats = getSummaryStats();
  const completionRate = stats.total > 0 ? ((stats.total - stats.notInspected) / stats.total) * 100 : 0;

  const downloadReport = () => {
    // In a real app, this would generate and download a PDF
    toast.success('Report downloaded successfully!');
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/reports">
            <Button variant="outline" className="border-purple-500 text-purple-300 hover:bg-purple-500 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Reports
            </Button>
          </Link>
          
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold">Inspection Report</h1>
            <p className="text-purple-300">{inspection.theaterName}</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={downloadReport} className="bg-green-600 hover:bg-green-700">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button onClick={printReport} variant="outline" className="border-blue-500 text-blue-300 hover:bg-blue-500 hover:text-white">
              <Print className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Report Header */}
        <Card className="p-6 mb-6 bg-gray-800/50 border-purple-500/30">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-sm text-gray-300">Theater</p>
                <p className="font-semibold">{inspection.theaterName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-sm text-gray-300">Inspector</p>
                <p className="font-semibold">{inspection.inspectorName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-sm text-gray-300">Inspection Date</p>
                <p className="font-semibold">{new Date(inspection.inspectionDate).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-sm text-gray-300">Production Start</p>
                <p className="font-semibold">
                  {inspection.productionStartDate 
                    ? new Date(inspection.productionStartDate).toLocaleDateString()
                    : 'Not specified'
                  }
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Summary Statistics */}
        <Card className="p-6 mb-6 bg-gray-800/50 border-purple-500/30">
          <h2 className="text-xl font-bold mb-4">Inspection Summary</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-400">{Math.round(completionRate)}%</p>
              <p className="text-sm text-gray-300">Completion Rate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-400">{stats.poor + stats.critical}</p>
              <p className="text-sm text-gray-300">Critical Issues</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-400">{stats.fair + stats.high + stats.medium}</p>
              <p className="text-sm text-gray-300">Attention Needed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{stats.good}</p>
              <p className="text-sm text-gray-300">Good Condition</p>
            </div>
          </div>
        </Card>

        {/* Detailed Results */}
        <Tabs defaultValue="0" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            {inspection.categories.map((category, index) => (
              <TabsTrigger key={index} value={index.toString()}>
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {inspection.categories.map((category, categoryIndex) => (
            <TabsContent key={categoryIndex} value={categoryIndex.toString()}>
              <Card className="p-6 bg-gray-800/50 border-purple-500/30">
                <h2 className="text-2xl font-bold mb-4 text-purple-300">{category.name}</h2>
                <p className="text-gray-300 mb-6">{category.description}</p>
                
                <div className="space-y-4">
                  {category.items.map((item, itemIndex) => (
                    <Card key={itemIndex} className="p-4 bg-gray-700/50 border-gray-600">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white mb-1">{item.name}</h3>
                          <p className="text-sm text-gray-300">{item.description}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <div className={`flex items-center gap-1 ${getConditionColor(item.condition)}`}>
                            {getConditionIcon(item.condition)}
                            <span className="text-sm capitalize">{item.condition.replace('-', ' ')}</span>
                          </div>
                          {item.priority !== 'low' && (
                            <Badge className={`${getPriorityColor(item.priority)} text-white`}>
                              {item.priority}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {item.notes && (
                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-300 mb-1">Notes:</p>
                          <p className="text-sm text-gray-200 bg-gray-600/50 p-2 rounded">{item.notes}</p>
                        </div>
                      )}

                      {item.photos.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-300 mb-2">Photos ({item.photos.length}):</p>
                          <div className="flex gap-2">
                            {item.photos.map((photo, photoIndex) => (
                              <div key={photoIndex} className="w-16 h-16 bg-gray-600 rounded border border-gray-500 flex items-center justify-center">
                                <Camera className="w-6 h-6 text-gray-400" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Recommendations */}
        <Card className="p-6 mt-6 bg-gray-800/50 border-purple-500/30">
          <h2 className="text-xl font-bold mb-4 text-purple-300">Recommendations & Action Items</h2>
          
          {stats.poor > 0 || stats.critical > 0 ? (
            <div className="space-y-4">
              <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4">
                <h3 className="font-bold text-red-300 mb-2">Critical Issues Requiring Immediate Attention:</h3>
                <ul className="space-y-1 text-sm">
                  {inspection.categories.map(category =>
                    category.items
                      .filter(item => item.condition === 'poor' || item.priority === 'critical')
                      .map((item, index) => (
                        <li key={index} className="text-red-200">
                          • {category.name}: {item.name}
                          {item.notes && ` - ${item.notes}`}
                        </li>
                      ))
                  )}
                </ul>
              </div>
              
              {stats.fair > 0 && (
                <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-4">
                  <h3 className="font-bold text-yellow-300 mb-2">Items Requiring Attention:</h3>
                  <ul className="space-y-1 text-sm">
                    {inspection.categories.map(category =>
                      category.items
                        .filter(item => item.condition === 'fair')
                        .map((item, index) => (
                          <li key={index} className="text-yellow-200">
                            • {category.name}: {item.name}
                            {item.notes && ` - ${item.notes}`}
                          </li>
                        ))
                    )}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4">
              <p className="text-green-300">
                ✅ All inspected items are in good condition. The theater space appears ready for production.
              </p>
            </div>
          )}
          
          <div className="mt-6 p-4 bg-blue-900/30 border border-blue-500/30 rounded-lg">
            <h3 className="font-bold text-blue-300 mb-2">General Recommendations:</h3>
            <ul className="space-y-1 text-sm text-blue-200">
              <li>• Complete all critical repairs at least 1 week before production start date</li>
              <li>• Schedule follow-up inspections for items marked as "Fair" condition</li>
              <li>• Maintain regular inspection schedule throughout production run</li>
              <li>• Document all repairs and improvements for future reference</li>
              <li>• Ensure all safety equipment is tested and functional before opening night</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}