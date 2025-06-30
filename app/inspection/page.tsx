"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Camera, 
  Save, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  FileText,
  Calendar,
  MapPin,
  User,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import { InspectionData, InspectionItem, inspectionCategories } from '@/lib/inspection-data';
import { toast } from 'sonner';

export default function InspectionPage() {
  const [inspectionData, setInspectionData] = useState<InspectionData>({
    id: '',
    theaterName: '',
    inspectorName: '',
    inspectionDate: new Date().toISOString().split('T')[0],
    productionStartDate: '',
    categories: inspectionCategories.map(cat => ({
      ...cat,
      items: cat.items.map(item => ({
        ...item,
        condition: 'not-inspected' as const,
        notes: '',
        photos: [],
        priority: 'low' as const
      }))
    }))
  });

  const [activeCategory, setActiveCategory] = useState(0);
  const [selectedItem, setSelectedItem] = useState<InspectionItem | null>(null);

  useEffect(() => {
    // Generate unique ID for this inspection
    setInspectionData(prev => ({
      ...prev,
      id: `INS-${Date.now()}`
    }));
  }, []);

  const updateInspectionInfo = (field: string, value: string) => {
    setInspectionData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateItemCondition = (categoryIndex: number, itemIndex: number, condition: 'good' | 'fair' | 'poor', notes: string, priority: 'low' | 'medium' | 'high' | 'critical') => {
    setInspectionData(prev => ({
      ...prev,
      categories: prev.categories.map((cat, catIdx) => 
        catIdx === categoryIndex 
          ? {
              ...cat,
              items: cat.items.map((item, itemIdx) => 
                itemIdx === itemIndex 
                  ? { ...item, condition, notes, priority }
                  : item
              )
            }
          : cat
      )
    }));
  };

  const addPhoto = (categoryIndex: number, itemIndex: number, photoUrl: string) => {
    setInspectionData(prev => ({
      ...prev,
      categories: prev.categories.map((cat, catIdx) => 
        catIdx === categoryIndex 
          ? {
              ...cat,
              items: cat.items.map((item, itemIdx) => 
                itemIdx === itemIndex 
                  ? { ...item, photos: [...item.photos, photoUrl] }
                  : item
              )
            }
          : cat
      )
    }));
  };

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

  const calculateProgress = () => {
    const totalItems = inspectionData.categories.reduce((sum, cat) => sum + cat.items.length, 0);
    const inspectedItems = inspectionData.categories.reduce((sum, cat) => 
      sum + cat.items.filter(item => item.condition !== 'not-inspected').length, 0
    );
    return totalItems > 0 ? (inspectedItems / totalItems) * 100 : 0;
  };

  const saveInspection = () => {
    if (!inspectionData.theaterName || !inspectionData.inspectorName) {
      toast.error('Please fill in theater name and inspector name');
      return;
    }

    // Save to localStorage (in a real app, this would be saved to a database)
    const savedInspections = JSON.parse(localStorage.getItem('theater-inspections') || '[]');
    const existingIndex = savedInspections.findIndex((insp: InspectionData) => insp.id === inspectionData.id);
    
    if (existingIndex >= 0) {
      savedInspections[existingIndex] = inspectionData;
    } else {
      savedInspections.push(inspectionData);
    }
    
    localStorage.setItem('theater-inspections', JSON.stringify(savedInspections));
    toast.success('Inspection saved successfully!');
  };

  const generateReport = () => {
    if (calculateProgress() < 100) {
      toast.error('Please complete all inspection items before generating report');
      return;
    }
    
    saveInspection();
    window.open(`/reports/${inspectionData.id}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/">
            <Button variant="outline" className="border-purple-500 text-purple-300 hover:bg-purple-500 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold">Theater Inspection</h1>
            <p className="text-purple-300">ID: {inspectionData.id}</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={saveInspection} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button onClick={generateReport} className="bg-green-600 hover:bg-green-700">
              <FileText className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <Card className="p-4 mb-6 bg-gray-800/50 border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Inspection Progress</span>
            <span className="text-sm text-purple-300">{Math.round(calculateProgress())}% Complete</span>
          </div>
          <Progress value={calculateProgress()} className="h-2" />
        </Card>

        {/* Inspection Info */}
        <Card className="p-6 mb-6 bg-gray-800/50 border-purple-500/30">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-purple-400" />
            Inspection Information
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Theater Name *</label>
              <Input
                value={inspectionData.theaterName}
                onChange={(e) => updateInspectionInfo('theaterName', e.target.value)}
                placeholder="Enter theater name"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Inspector Name *</label>
              <Input
                value={inspectionData.inspectorName}
                onChange={(e) => updateInspectionInfo('inspectorName', e.target.value)}
                placeholder="Enter inspector name"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Inspection Date</label>
              <Input
                type="date"
                value={inspectionData.inspectionDate}
                onChange={(e) => updateInspectionInfo('inspectionDate', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Production Start Date</label>
              <Input
                type="date"
                value={inspectionData.productionStartDate}
                onChange={(e) => updateInspectionInfo('productionStartDate', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>
        </Card>

        {/* Inspection Categories */}
        <Tabs value={activeCategory.toString()} onValueChange={(value) => setActiveCategory(parseInt(value))}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            {inspectionData.categories.map((category, index) => (
              <TabsTrigger key={index} value={index.toString()} className="text-sm">
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {inspectionData.categories.map((category, categoryIndex) => (
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

                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Condition</label>
                          <Select
                            value={item.condition}
                            onValueChange={(value) => {
                              const priority = value === 'poor' ? 'critical' : value === 'fair' ? 'medium' : 'low';
                              updateItemCondition(categoryIndex, itemIndex, value as any, item.notes, priority);
                            }}
                          >
                            <SelectTrigger className="bg-gray-600 border-gray-500 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not-inspected">Not Inspected</SelectItem>
                              <SelectItem value="good">Good</SelectItem>
                              <SelectItem value="fair">Fair</SelectItem>
                              <SelectItem value="poor">Poor</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                          <Select
                            value={item.priority}
                            onValueChange={(value) => updateItemCondition(categoryIndex, itemIndex, item.condition as any, item.notes, value as any)}
                          >
                            <SelectTrigger className="bg-gray-600 border-gray-500 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-end">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                className="w-full border-purple-500 text-purple-300 hover:bg-purple-500 hover:text-white"
                                onClick={() => setSelectedItem(item)}
                              >
                                <Camera className="w-4 h-4 mr-2" />
                                Add Photo
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-gray-800 border-purple-500">
                              <DialogHeader>
                                <DialogTitle className="text-white">Add Photo - {item.name}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Input
                                  type="file"
                                  accept="image/*"
                                  className="bg-gray-700 border-gray-600 text-white"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      // In a real app, you'd upload the file and get a URL
                                      const fakeUrl = `photo-${Date.now()}.jpg`;
                                      addPhoto(categoryIndex, itemIndex, fakeUrl);
                                      toast.success('Photo added successfully!');
                                    }
                                  }}
                                />
                                <p className="text-sm text-gray-400">
                                  Upload photos to document the condition of this item
                                </p>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
                        <Textarea
                          value={item.notes}
                          onChange={(e) => updateItemCondition(categoryIndex, itemIndex, item.condition as any, e.target.value, item.priority)}
                          placeholder="Add detailed notes about the condition, issues found, or recommendations..."
                          className="bg-gray-600 border-gray-500 text-white"
                          rows={3}
                        />
                      </div>

                      {item.photos.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-gray-300 mb-2">Photos ({item.photos.length})</p>
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
      </div>
    </div>
  );
}