import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Box,
  Typography,
  IconButton,
  Alert
} from '@mui/material';
import { Download, Close } from '@mui/icons-material';

interface ReceiptViewerProps {
  open: boolean;
  onClose: () => void;
  paymentId: number;
  receiptUrl: string;
  onDownload: (paymentId: number) => Promise<void>;
}

const ReceiptViewer: React.FC<ReceiptViewerProps> = ({ 
  open, 
  onClose, 
  paymentId,
  receiptUrl,
  onDownload 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onDownload(paymentId);
    } catch (err) {
      setError('Failed to download receipt');
      console.error('Download error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Payment Receipt #{paymentId}</Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers sx={{ minHeight: '500px' }}>
        {error ? (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        ) : (
          <iframe
            src={receiptUrl}
            title={`Receipt for Payment #${paymentId}`}
            width="100%"
            height="100%"
            style={{ border: 'none' }}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setError('Failed to load receipt');
            }}
          />
        )}
        {isLoading && (
          <Box 
            position="absolute" 
            top={0} 
            left={0} 
            right={0} 
            bottom={0} 
            display="flex" 
            justifyContent="center" 
            alignItems="center"
            bgcolor="rgba(255,255,255,0.7)"
          >
            <CircularProgress />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Download />}
          onClick={handleDownload}
          disabled={isLoading}
        >
          {isLoading ? 'Downloading...' : 'Download'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReceiptViewer;