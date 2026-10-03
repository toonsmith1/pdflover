import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useI18n } from '../i18n/LanguageContext';
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
import SignatureTool from './tools/SignatureTool';
import GenericTool from './tools/GenericTool';
import ImageTool from './tools/ImageTool';
import ImagePdfTool from './tools/ImagePdfTool';
import ExtractTextTool from './tools/ExtractTextTool';
import ExtractTableTool from './tools/ExtractTableTool';
import SecurityTool from './tools/SecurityTool';
import RedactTool from './tools/RedactTool';
import DeletePagesTool from './tools/DeletePagesTool';
import InsertPageTool from './tools/InsertPageTool';
import WordToPdfTool from './tools/WordToPdfTool';

export default function ToolPage() {
  const { toolId } = useParams();
  const { toolMap, t } = useI18n();
  const tool = toolMap[toolId];

  useEffect(() => {
    if (tool) {
      document.title = `${tool.name} — pdflover`;
    } else {
      document.title = `${t('toolPage.notFoundTitle')} — pdflover`;
    }
  }, [tool, t]);

  if (!tool) {
    return (
      <main className="tool-page wrap">
        <Link to="/" className="back">{t('toolPage.back')}</Link>
        <h1>{t('toolPage.notFoundTitle')}</h1>
        <p>{t('toolPage.notFoundDesc')}</p>
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
      case 'signature':
        return <SignatureTool />;
      case 'image':
        return <ImageTool />;
      case 'image-pdf':
        return <ImagePdfTool />;
      case 'extract-text':
        return <ExtractTextTool />;
      case 'extract-table':
        return <ExtractTableTool />;
      case 'protect':
        return <SecurityTool mode="protect" />;
      case 'unlock':
        return <SecurityTool mode="unlock" />;
      case 'redact':
        return <RedactTool />;
      case 'delete-pages':
        return <DeletePagesTool />;
      case 'insert-page':
        return <InsertPageTool />;
      case 'word-to-pdf':
        return <WordToPdfTool />;
      default:
        return <GenericTool toolId={toolId} />;
    }
  };

  return (
    <main className="tool-page wrap tool-page--workspace">
      <div className="tool-heading-row">
        <Link to="/" className="back">{t('toolPage.back')}</Link>
        <span className="tool-heading-separator" aria-hidden="true">/</span>
        <h1 id="title">{tool.name}</h1>
      </div>
      <div className="tool-subheading">
        <small id="category">{tool.categoryLabel}</small>
        <span className="tool-subheading-separator" aria-hidden="true">·</span>
        <p id="description">{tool.desc}</p>
      </div>
      {renderToolComponent()}
    </main>
  );
}
