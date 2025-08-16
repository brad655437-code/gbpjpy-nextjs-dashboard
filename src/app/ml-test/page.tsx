'use client';

import React, { useState, useEffect } from 'react';
import { ModelTraining } from '@/components/ml/ModelTraining';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function MLTestPage() {
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testTensorFlowJS = async () => {
    setLoading(true);
    try {
      const tf = await import('@tensorflow/tfjs');
      console.log('TensorFlow.js version:', tf.version);
      
      const tensor = tf.tensor([1, 2, 3, 4]);
      const result = tensor.square();
      const data = await result.data();
      
      setTestResults({
        success: true,
        version: JSON.stringify(tf.version),
        tensorTest: Array.from(data),
        message: 'TensorFlow.js loaded successfully!'
      });
      
      tensor.dispose();
      result.dispose();
    } catch (error) {
      setTestResults({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to load TensorFlow.js'
      });
    } finally {
      setLoading(false);
    }
  };

  const testMLAPI = async () => {
    try {
      const response = await fetch('/api/models/train');
      const data = await response.json();
      console.log('ML API Response:', data);
    } catch (error) {
      console.error('ML API Error:', error);
    }
  };

  useEffect(() => {
    testTensorFlowJS();
    testMLAPI();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900">ML Testing & Training</h1>
          <p className="text-gray-600 mt-2">
            Test TensorFlow.js integration and train machine learning models
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                TensorFlow.js Test Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Testing TensorFlow.js...</p>
                </div>
              ) : testResults ? (
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg ${
                    testResults.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <p className={`font-medium ${
                      testResults.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {testResults.message}
                    </p>
                    {testResults.success && (
                      <div className="mt-2 text-sm text-green-700">
                        <p>Version: {testResults.version}</p>
                        <p>Tensor test result: [{testResults.tensorTest.join(', ')}]</p>
                      </div>
                    )}
                    {!testResults.success && (
                      <p className="mt-2 text-sm text-red-700">
                        Error: {testResults.error}
                      </p>
                    )}
                  </div>
                  
                  <button
                    onClick={testTensorFlowJS}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Retest TensorFlow.js
                  </button>
                </div>
              ) : (
                <p className="text-gray-500">No test results yet</p>
              )}
            </CardContent>
          </Card>

          <ModelTraining />
        </div>
      </div>
    </div>
  );
}
