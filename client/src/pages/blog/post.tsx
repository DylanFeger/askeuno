import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, ArrowLeft, ChevronRight } from "lucide-react";
import type { BlogPost } from "@shared/schema";

export default function BlogPostPage() {
  const { slug } = useParams();
  const [, setLocation] = useLocation();

  // Fetch the blog post
  const { data: post, isLoading, error } = useQuery<BlogPost>({
    queryKey: [`/api/blog/${slug}`],
    enabled: !!slug,
  });

  // Fetch all posts for related posts section
  const { data: allPosts = [] } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">Loading post...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Post Not Found</h1>
          <p className="text-gray-600 mb-8">The blog post you're looking for doesn't exist.</p>
          <Link href="/blog">
            <Button className="bg-green-600 hover:bg-green-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'best-of': 'Best-of Lists',
      'use-case': 'Use Case Spotlights',
      'pain-point': 'Pain Point Posts',
      'competitor': 'Competitor Comparisons',
      'tutorial': 'Tutorials & How-Tos'
    };
    return labels[category] || category;
  };

  // Parse related posts from JSON
  const relatedPostSlugs = JSON.parse(post.relatedPosts as string || '[]') as string[];
  const relatedPosts = allPosts.filter(p => 
    relatedPostSlugs.includes(p.slug) && p.slug !== post.slug
  ).slice(0, 3);

  // Convert markdown-style content to HTML (basic conversion)
  const renderContent = (content: string) => {
    // This is a simplified markdown renderer. In production, you'd use a proper markdown library
    return content
      .split('\n\n')
      .map((paragraph, index) => {
        // Handle headers
        if (paragraph.startsWith('## ')) {
          return `<h2 class="text-2xl font-bold mt-8 mb-4 text-gray-900">${paragraph.slice(3)}</h2>`;
        }
        if (paragraph.startsWith('### ')) {
          return `<h3 class="text-xl font-semibold mt-6 mb-3 text-gray-900">${paragraph.slice(4)}</h3>`;
        }
        // Handle lists
        if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
          const items = paragraph.split('\n').map(item => 
            `<li class="ml-6 mb-2">${item.slice(2)}</li>`
          ).join('');
          return `<ul class="list-disc mb-6 text-gray-700">${items}</ul>`;
        }
        // Handle code blocks
        if (paragraph.startsWith('```')) {
          const code = paragraph.slice(3, -3);
          return `<pre class="bg-gray-100 p-4 rounded-lg mb-6 overflow-x-auto"><code class="text-sm">${code}</code></pre>`;
        }
        // Regular paragraphs
        return `<p class="mb-6 text-gray-700 leading-relaxed">${paragraph}</p>`;
      })
      .join('');
  };

  return (
    <>
      <SEO
        title={`${post.title} - Euno Blog`}
        description={post.metaDescription}
      />
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        <Navbar />
        
        {/* Breadcrumb */}
        <div className="container mx-auto px-4 pt-8">
          <nav className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/blog">
              <span className="hover:text-green-600 cursor-pointer">Blog</span>
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900">{getCategoryLabel(post.category)}</span>
          </nav>
        </div>

        {/* Article */}
        <article className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-green-100 text-green-700">
                {getCategoryLabel(post.category)}
              </Badge>
              {post.featured && (
                <Badge className="bg-yellow-100 text-yellow-700">
                  Featured
                </Badge>
              )}
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {post.title}
            </h1>
            
            <p className="text-xl text-gray-600 mb-6">
              {post.excerpt}
            </p>
            
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 pb-6 border-b border-gray-200">
              <span className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {post.author}
              </span>
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {formatDate(post.publishedDate)}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {post.readTime} min read
              </span>
            </div>
          </header>

          {/* Content */}
          <div 
            className="prose prose-lg max-w-none mb-12"
            dangerouslySetInnerHTML={{ __html: renderContent(post.content) }}
          />

          {/* Back to Blog Button */}
          <div className="mb-12">
            <Link href="/blog">
              <Button variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Blog
              </Button>
            </Link>
          </div>

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <div className="border-t border-gray-200 pt-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Posts</h2>
              <div className="grid gap-6 md:grid-cols-3">
                {relatedPosts.map((relatedPost) => (
                  <Link key={relatedPost.id} href={`/blog/${relatedPost.slug}`}>
                    <Card className="h-full border-green-200 hover:border-green-400 hover:shadow-lg transition-all duration-300 cursor-pointer group">
                      <CardHeader>
                        <Badge variant="secondary" className="bg-green-100 text-green-700 mb-2 w-fit">
                          {getCategoryLabel(relatedPost.category)}
                        </Badge>
                        <h3 className="text-lg font-semibold group-hover:text-green-600 transition-colors">
                          {relatedPost.title}
                        </h3>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                          {relatedPost.excerpt}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{formatDate(relatedPost.publishedDate)}</span>
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Newsletter CTA */}
          <div className="mt-16 bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-8 text-white text-center">
            <h3 className="text-2xl font-bold mb-3">Get More Insights</h3>
            <p className="text-green-100 mb-6">
              Subscribe to our newsletter for the latest data analytics tips and tutorials
            </p>
            <Link href="/contact">
              <Button size="lg" className="bg-white text-green-700 hover:bg-green-50">
                Subscribe Now
              </Button>
            </Link>
          </div>
        </article>

        <Footer />
      </div>
    </>
  );
}