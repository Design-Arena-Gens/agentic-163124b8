import Dropzone from "@/components/Dropzone";
import Controls from "@/components/Controls";
import ExportBar from "@/components/ExportBar";
import ShareBar from "@/components/ShareBar";
import Gallery from "@/components/Gallery";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-zinc-200">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl font-semibold">Intelligent Photo Dashboard</h1>
          <div className="flex items-center gap-3">
            <ExportBar />
            <ShareBar />
          </div>
        </header>

        <Dropzone />

        <Controls />

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Best photos</h2>
          <Gallery />
        </section>
      </div>
    </div>
  );
}
