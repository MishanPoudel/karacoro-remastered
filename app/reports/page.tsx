"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, FileText, Calendar, MapPin, User, Search, Eye, Download, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { InspectionData } from '@/lib/inspection-data';
import { toast } from 'sonner';

export default function ReportsPage() {
  const [inspections, setInspections] = useState<InspectionData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredInspections, setFilteredInspections] = useState<InspectionData[]>([]);

  useEffect(() => {
    // Load inspections from localStorage
    const savedInspections = JSON.parse(localStorage.getItem('theater-inspections') || '[]');
    setInspections(savedInspections);
    setFilteredInspections(savedInspections);
  }, []);

  useEffect(() => {
    // Filter inspections based on search term
    const filtered = inspections.filter(inspection =>
      inspection.theaterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspection.inspectorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspection.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredInspections(filtered);
  }, [searchTerm, inspections]);

  const deleteInspection = (id: string) => {
    const updatedInspections = inspections.filter(insp => insp.id !== id);
    setInspections(updatedInspections);
    localStorage.setItem('theater-inspections', JSON.stringify(updatedInspections));
    toast.success('Inspection deleted successfully');
  };

  const getInspectionStatus = (inspection: InspectionData) => {
    const totalItems = inspection.categories.reduce((sum, cat) => sum + cat.items.length, 0);
    const inspectedItems = inspection.categories.reduce((sum, cat) => 
      sum + cat.items.filter(item => item.condition !== 'not-inspected').length, 0
    );
    const progress = totalItems > 0 ? (inspectedItems / totalItems) * 100 : 0;
    
    if (progress === 100) return { status: 'Complete', color: 'bg-green-500' };
    if (progress > 0) return { status: 'In Progress', color: 'bg-yellow-500' };
    return { status: 'Not Started', color: 'bg-gray-500' };
  };

  const getCriticalIssuesCount = (inspection: InspectionData) => {
    return inspection.categories.reduce((sum, cat) => 
      sum + cat.items.filter(item => item.condition === 'poor' || item.priority === 'critical').length, 0
    );
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
            <h1 className="text-2xl md:text-3xl font-bold">Inspection Reports</h1>
            <p className="text-purple-300">View and manage theater inspections</p>
          </div>

          <Link href="/inspection">
            <Button className="bg-purple-600 hover:bg-purple-700">
              <FileText className="w-4 h-4 mr-2" />
              New Inspection
            </Button>
          </Link>
        </div>

        {/* Search */}
        <Card className="p-4 mb-6 bg-gray-800/50 border-purple-500/30">
          <div className="flex items-center gap-4">
            <Search className="w-5 h-5 text-purple-400" />
            <Input
              placeholder="Search by theater name, inspector, or inspection ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-gray-700 border-gray-600 text-white"
            />
          </div>
        </Card>

        {/* Reports List */}
        {filteredInspections.length === 0 ? (
          <Card className="p-12 text-center bg-gray-800/50 border-purple-500/30">
            <FileText className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No Inspections Found</h3>
            <p className="text-gray-300 mb-6">
              {inspections.length === 0 
                ? "You haven't created any inspections yet." 
                : "No inspections match your search criteria."
              }
            </p>
            <Link href="/inspection">
              <Button className="bg-purple-600 hover:bg-purple-700">
                Create First Inspection
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-6">
            {filteredInspections.map((inspection) => {
              const status = getInspectionStatus(inspection);
              const criticalIssues = getCriticalIssuesCount(inspection);
              
              return (
                <Card key={inspection.id} className="p-6 bg-gray-800/50 border-purple-500/30 hover:border-purple-500/60 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">{inspection.theaterName}</h3>
                        <Badge className={`${status.color} text-white`}>
                          {status.status}
                        </Badge>
                        {criticalIssues > 0 && (
                          <Badge className="bg-red-500 text-white">
                            {criticalIssues} Critical Issues
                          </Badge>
                        )}
                      </div>
                      <p className="text-purple-300 font-mono text-sm mb-3">ID: {inspection.id}</p>
                      
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-300">
                          <User className="w-4 h-4" />
                          <span>Inspector: {inspection.inspectorName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-300">
                          <Calendar className="w-4 h-4" />
                          <span>Inspected: {new Date(inspection.inspectionDate).toLocaleDateString()}</span>
                        </div>
                        {inspection.productionStartDate && (
                          <div className="flex items-center gap-2 text-gray-300">
                            <MapPin className="w-4 h-4" />
                            <span>Production: {new Date(inspection.productionStartDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Link href={`/reports/${inspection.id}`}>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </Link>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-green-500 text-green-400 hover:bg-green-500 hover:text-white"
                        onClick={() => {
                          // In a real app, this would generate and download a PDF
                          toast.success('Report downloaded successfully!');
                        }}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        PDF
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                        onClick={() => deleteInspection(inspection.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Progress Summary */}
                  <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-gray-700">
                    {inspection.categories.map((category, index) => {
                      const categoryProgress = category.items.filter(item => item.condition !== 'not-inspected').length;
                      const categoryTotal = category.items.length;
                      const categoryIssues = category.items.filter(item => item.condition === 'poor').length;
                      
                      return (
                        <div key={index} className="text-center">
                          <h4 className="text-sm font-medium text-gray-300 mb-1">{category.name}</h4>
                          <p className="text-lg font-bold text-white">{categoryProgress}/{categoryTotal}</p>
                          {categoryIssues > 0 && (
                            <p className="text-xs text-red-400">{categoryIssues} issues</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}