"use client";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Clock, Eye, Lock } from "lucide-react";
import { Header } from "@/components/header";
import { SEO } from "@/components/seo";
import { STRUCTURED_DATA, SEO_KEYWORDS } from "@/lib/constants";
import BubbleChat from "@/components/BubbleChat";

export default function Home() {
  // Combine structured data for the homepage
  const structuredData = {
    ...STRUCTURED_DATA.organization,
    mainEntity: STRUCTURED_DATA.softwareApplication,
  };

  return (
    <>
      <SEO
        description="Secure file delivery with military-grade security, time-limited access, and download limits. Transport your files securely with no questions asked."
        keywords={SEO_KEYWORDS.home}
        structuredData={structuredData}
      />

      <div className="flex min-h-screen flex-col">
        <Header />
        <BubbleChat
          position="bottom-right"
          bubbleColor="bg-green-600"
          chatTitle="Support Assistant"
          welcomeMessage="Hello! How can I help you today?"
          apiEndpoint="/api/chat"
        />
        <main className="flex-1">
          {/* Hero Section - Split Design */}
          <section className="container py-12 md:py-20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="order-2 md:order-1">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                  Secure file delivery with{" "}
                  <span className="text-primary">no questions asked</span>
                </h1>
                <p className="text-lg text-muted-foreground mb-8">
                  Upload, share, and protect your files with military-grade
                  security and time-limited access.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/upload">
                    <Button size="lg" className="gap-2 w-full sm:w-auto">
                      Start sharing <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="#how-it-works">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      How it works
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="order-1 md:order-2 relative">
                <div className="relative h-[400px] md:h-[500px] w-full overflow-hidden rounded-lg shadow-xl">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10"></div>
                  <Image
                    src="/images/the-transporter-poster.jpeg"
                    alt="The Transporter - Secure File Sharing Service"
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                    <div className="flex items-center gap-2 text-white">
                      <Lock className="h-5 w-5" />
                      <span className="font-semibold">
                        Military-grade security
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="bg-muted py-16">
            <div className="container">
              <h2 className="text-3xl font-bold text-center mb-12">
                Professional-grade file sharing
              </h2>
              <div className="grid gap-8 md:grid-cols-3">
                <div className="bg-background rounded-lg p-6 shadow-sm">
                  <div className="rounded-full bg-primary/10 p-4 w-fit mb-4">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Secure Sharing</h3>
                  <p className="text-muted-foreground">
                    Files are stored in private storage and only accessible via
                    secure, time-limited links.
                  </p>
                </div>
                <div className="bg-background rounded-lg p-6 shadow-sm">
                  <div className="rounded-full bg-primary/10 p-4 w-fit mb-4">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    Time-Limited Access
                  </h3>
                  <p className="text-muted-foreground">
                    Set expiration dates for your shared files.
                  </p>
                </div>
                <div className="bg-background rounded-lg p-6 shadow-sm">
                  <div className="rounded-full bg-primary/10 p-4 w-fit mb-4">
                    <Eye className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    Download Limits
                  </h3>
                  <p className="text-muted-foreground">
                    Restrict the number of times a file can be downloaded.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* How It Works Section with Image Element */}
          <section id="how-it-works" className="container py-16 md:py-24">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">How It Works</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                The Transporter delivers your files securely and efficiently,
                just like in the movie.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
              <div className="lg:col-span-2 order-2 lg:order-1">
                <div className="relative aspect-[3/4] w-full max-w-md mx-auto rounded-lg overflow-hidden shadow-xl">
                  {/* Use a portion of the image that focuses on the character */}
                  <Image
                    src="/images/the-transporter-poster.jpeg"
                    alt="The Transporter - Secure File Delivery Service"
                    fill
                    className="object-cover object-[30%_20%]"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="inline-block bg-primary text-white px-4 py-2 rounded-md font-bold">
                      The Transporter
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-3 order-1 lg:order-2">
                <div className="space-y-8">
                  <div className="flex gap-4 items-start">
                    <div className="bg-primary/10 rounded-full p-3 mt-1">
                      <span className="font-bold text-primary">1</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">
                        Upload Your File
                      </h3>
                      <p className="text-muted-foreground">
                        Upload any file to our secure platform. Your files are
                        encrypted and stored safely.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="bg-primary/10 rounded-full p-3 mt-1">
                      <span className="font-bold text-primary">2</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">
                        Set Security Rules
                      </h3>
                      <p className="text-muted-foreground">
                        Define how long your file is available and how many
                        times it can be downloaded.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="bg-primary/10 rounded-full p-3 mt-1">
                      <span className="font-bold text-primary">3</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">
                        Share the Link
                      </h3>
                      <p className="text-muted-foreground">
                        Share the secure link with anyone who needs access to
                        your file.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="bg-primary/10 rounded-full p-3 mt-1">
                      <span className="font-bold text-primary">4</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">
                        Track Downloads
                      </h3>
                      <p className="text-muted-foreground">
                        Monitor who accesses your files and receive
                        notifications when they're downloaded.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="bg-primary/10 py-16">
            <div className="container">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl font-bold mb-4">
                  Ready to transport your files?
                </h2>
                <p className="text-lg mb-8">
                  Join thousands of professionals who trust The Transporter for
                  secure file sharing.
                </p>
                <Link href="/register">
                  <Button size="lg" className="gap-2">
                    Get started for free <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </main>
        <footer className="border-t py-6 bg-secondary text-white">
          <div className="container flex flex-col sm:flex-row justify-between items-center gap-4 px-4">
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} The Transporter. All rights reserved.
            </p>
            <div className="flex gap-4">
              <Link
                href="/privacy"
                className="text-sm text-gray-400 hover:text-white"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-gray-400 hover:text-white"
              >
                Terms
              </Link>
              <Link
                href="/contact"
                className="text-sm text-gray-400 hover:text-white"
              >
                Contact
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
