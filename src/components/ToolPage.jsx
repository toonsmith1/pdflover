import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { TOOL_MAP } from '../data/tools';
import CompressTool from './tools/CompressTool';
import SplitTool from './tools/SplitTool';
import MergeTool from './tools/MergeTool';
import OrganizeTool from './tools/OrganizeTool';
import RotateTool from './tools/RotateTool';
import CropTool from './tools/CropTool';
import TextTool from './tools/TextTool';
import NoteTool from './tools/NoteTool';
import PageNumTool from './tools/PageNumTool';
import WatermarkTool from './tools/WatermarkTool';
import GenericTool from './tools/GenericTool';

export default function ToolPage() {
  const { toolId } = useParams();
  const tool = TOOL_MAP[toolId];

  useEffect(() => {
    if (tool) {
      document.title = `${tool.name} — pdflover`;
    } else {
      document.title = 'ไม่พบเครื่องมือ — pdflover';
    }
  }, [tool]);

  if (!tool) {
    return (
      <main className="tool-page wrap">
        <Link to="/" className="back">← กลับไปเลือกเครื่องมือ</Link>
        <h1>ไม่พบเครื่องมือนี้</h1>
        <p>กรุณากลับไปที่หน้าหลักเพื่อเลือกเครื่องมือใหม่อีกครั้ง</p>
      </main>
    );
  }

  const renderToolComponent = () => {
    switch (toolId) {
      case 'compress':
        return <CompressTool />;
      case 'split':
        return <SplitTool />;
      case 'merge':
        return <MergeTool />;
      case 'organize':
        return <OrganizeTool />;
      case 'rotate':
        return <RotateTool />;
      case 'crop':
        return <CropTool />;
      case 'text':
        return <TextTool />;
      case 'note':
        return <NoteTool />;
      case 'pagenum':
        return <PageNumTool />;
      case 'watermark':
        return <WatermarkTool />;
      default:
        return <GenericTool toolId={toolId} />;
    }
  };

  return (
    <main className="tool-page wrap">
      <Link to="/" className="back">← กลับไปเลือกเครื่องมือ</Link>
      <small id="category">{tool.categoryLabel}</small>
      <h1 id="title">{tool.name}</h1>
      <p id="description">{tool.desc}</p>
      {renderToolComponent()}
    </main>
  );
}
