import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageLayout from '../../components/ui/PageHeaderContainer';
import HelpSupportHome from './components/HelpSupportHome';
import MyRequestsList from './components/MyRequestsList';
import RequestDetailsView from './components/RequestDetailsView';
import HelpArticleDetailView from './components/HelpArticleDetailView';
import RaiseRequestModal from './components/RaiseRequestModal';

export default function SupportPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);

  const articleParam = searchParams.get('article');
  const requestParam = searchParams.get('request');
  const viewParam = searchParams.get('view');

  // Determine current active view from URL params
  let currentView = 'home';
  if (articleParam) {
    currentView = 'article-detail';
  } else if (requestParam) {
    currentView = 'request-details';
  } else if (viewParam === 'my-requests') {
    currentView = 'my-requests';
  }

  // Handle hash scrolling on deep links
  useEffect(() => {
    if (window.location.hash) {
      const targetId = window.location.hash.replace('#', '');
      setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          const topOffset = el.getBoundingClientRect().top + window.pageYOffset - 100;
          window.scrollTo({ top: topOffset, behavior: 'smooth' });
        }
      }, 200);
    }
  }, [articleParam, requestParam, viewParam]);

  const handleSelectArticle = (articleId) => {
    setSearchParams({ article: articleId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCategory = (_catId) => {
    setSearchParams({ article: 'add-product' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectRequest = (reqId) => {
    setSearchParams({ request: reqId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenMyRequests = () => {
    setSearchParams({ view: 'my-requests' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToHome = () => {
    setSearchParams({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreatedRequestSuccess = (newTicket) => {
    if (newTicket?._id || newTicket?.ticketId) {
      setSearchParams({ request: newTicket._id || newTicket.ticketId });
    } else {
      setSearchParams({ view: 'my-requests' });
    }
  };

  return (
    <PageLayout hideHeader={true}>
      <div className="w-full">
        {/* SCREEN 1: HELP & SUPPORT HOME */}
        {currentView === 'home' && (
          <HelpSupportHome
            onSelectArticle={handleSelectArticle}
            onSelectCategory={handleSelectCategory}
            onOpenMyRequests={handleOpenMyRequests}
            onRaiseRequest={() => setIsRaiseModalOpen(true)}
          />
        )}

        {/* SCREEN 2: MY REQUESTS */}
        {currentView === 'my-requests' && (
          <MyRequestsList
            onSelectRequest={handleSelectRequest}
            onRaiseRequest={() => setIsRaiseModalOpen(true)}
          />
        )}

        {/* SCREEN 3: REQUEST DETAILS */}
        {currentView === 'request-details' && (
          <RequestDetailsView
            requestId={requestParam}
            onBack={handleOpenMyRequests}
            onRaiseRequest={() => setIsRaiseModalOpen(true)}
          />
        )}

        {/* SCREEN 4: HELP ARTICLE DETAIL */}
        {currentView === 'article-detail' && (
          <HelpArticleDetailView
            articleId={articleParam}
            onBack={handleBackToHome}
            onSelectCategory={handleSelectCategory}
            onSelectArticle={handleSelectArticle}
            onRaiseRequest={() => setIsRaiseModalOpen(true)}
          />
        )}

        {/* MODAL: RAISE NEW REQUEST */}
        <RaiseRequestModal
          isOpen={isRaiseModalOpen}
          onClose={() => setIsRaiseModalOpen(false)}
          onSuccessRequest={handleCreatedRequestSuccess}
        />
      </div>
    </PageLayout>
  );
}
