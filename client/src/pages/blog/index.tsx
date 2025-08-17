import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Calendar, Clock, ChevronRight } from "lucide-react";
import type { BlogPost } from "@shared/schema";

const categories = [
  { id: "best-of", name: "Best-of Lists", icon: "", description: "Top features and benefits of Euno" },
  { id: "use-case", name: "Use Case Spotlights", icon: "", description: "Real-world applications and success stories" },
  { id: "pain-point", name: "Pain Point Posts", icon: "🎯", description: "Solutions to common business challenges" },
  { id: "competitor", name: "Competitor Comparisons", icon: "⚖️", description: "How Euno compares to other solutions" },
  { id: "tutorial", name: "Tutorials & How-Tos", icon: "📚", description: "Step-by-step guides and best practices" }
];

export default function BlogHomepage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all blog posts
  const { data: allPosts = [], isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog"],
  });

  // Filter posts based on search query
  const filteredPosts = searchQuery 
    ? allPosts.filter(post => 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allPosts;

  // Group posts by category
  const postsByCategory = categories.reduce((acc, category) => {
    acc[category.id] = filteredPosts.filter(post => post.category === category.id);
    return acc;
  }, {} as Record<string, BlogPost[]>);

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <>
      <SEO
        title="Blog - Euno | Data Insights and Analytics Tips"
        description="Explore Euno's blog for data analytics insights, tutorials, use cases, and tips on making data-driven decisions for your business."
      />
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        <Navbar />
        
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-primary to-green-700 text-white py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-5xl font-bold mb-6">Euno Blog</h1>
              <p className="text-xl mb-8 text-green-100">
                Discover insights, tutorials, and tips for making data-driven decisions
              </p>
              
              {/* Search Bar */}
              <div className="relative max-w-xl mx-auto">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search blog posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-4 py-3 text-lg bg-white text-gray-900 border-gray-300 focus:border-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-12">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-4 text-gray-600">Loading blog posts...</p>
            </div>
          ) : searchQuery && filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No posts found matching "{searchQuery}"</p>
            </div>
          ) : (
            <div className="space-y-12">
              {categories.map((category) => {
                const categoryPosts = postsByCategory[category.id] || [];
                
                if (categoryPosts.length === 0 && !searchQuery) {
                  return null;
                }

                return (
                  <div key={category.id} className="animate-fadeIn">
                    <div className="flex items-center gap-4 mb-6">
                      <span className="text-3xl">{category.icon}</span>
                      <div>
                        <h2 className="text-3xl font-bold text-gray-900">{category.name}</h2>
                        <p className="text-gray-600">{category.description}</p>
                      </div>
                    </div>

                    {categoryPosts.length === 0 ? (
                      <Card className="border-green-200 bg-green-50/50">
                        <CardContent className="py-8 text-center">
                          <p className="text-gray-600">No posts in this category yet. Check back soon!</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {categoryPosts.map((post) => (
                          <Link key={post.id} href={`/blog/${post.slug}`}>
                            <Card className="h-full border-green-200 hover:border-green-400 hover:shadow-lg transition-all duration-300 cursor-pointer group">
                              <CardHeader>
                                <div className="flex items-center justify-between mb-2">
                                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                                    {category.name}
                                  </Badge>
                                  {post.featured && (
                                    <Badge variant="default" className="bg-yellow-500 text-white">
                                      Featured
                                    </Badge>
                                  )}
                                </div>
                                <CardTitle className="text-xl group-hover:text-primary transition-colors">
                                  {post.title}
                                </CardTitle>
                                <CardDescription className="line-clamp-2">
                                  {post.excerpt}
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="flex items-center justify-between text-sm text-gray-500">
                                  <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {formatDate(post.publishedDate)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {post.readTime} min read
                                    </span>
                                  </div>
                                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Newsletter CTA */}
          <div className="mt-20 bg-gradient-to-r from-primary to-green-700 rounded-2xl p-8 text-white text-center">
            <h3 className="text-3xl font-bold mb-4">Stay Updated</h3>
            <p className="text-lg mb-6 text-green-100">
              Get the latest data insights and analytics tips delivered to your inbox
            </p>
            <Link href="/contact">
              <Button size="lg" className="bg-white text-green-700 hover:bg-green-50">
                Subscribe to Newsletter
              </Button>
            </Link>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}