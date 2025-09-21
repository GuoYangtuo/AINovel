import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  Grid,
  TextField,
  CircularProgress
} from '@mui/material';
import { MonetizationOn } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const RechargeDialog = ({ 
  open, 
  onClose, 
  autoFillAmount = null, // 自动填充的充值金额
  title = '金币充值'
}) => {
  const { user, rechargeCoins } = useAuth();
  const [rechargeAmount, setRechargeAmount] = useState(autoFillAmount?.toString() || '');
  const [rechargeLoading, setRechargeLoading] = useState(false);

  // 当autoFillAmount改变时，更新输入框
  React.useEffect(() => {
    if (autoFillAmount !== null) {
      setRechargeAmount(autoFillAmount.toString());
    }
  }, [autoFillAmount]);

  const handleRecharge = async () => {
    const amount = parseInt(rechargeAmount);
    if (!amount || amount <= 0) {
      return;
    }

    setRechargeLoading(true);
    const result = await rechargeCoins(amount);
    setRechargeLoading(false);

    if (result.success) {
      handleClose();
    }
  };

  const handleClose = () => {
    if (!rechargeLoading) {
      setRechargeAmount('');
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: {
          bgcolor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          minWidth: '400px'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <MonetizationOn sx={{ color: '#ffd700' }} />
        {title}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          当前金币余额: {user?.coins || 0}
        </Typography>
        
        {autoFillAmount && (
          <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
            还需要 {autoFillAmount} 金币才能完成操作
          </Typography>
        )}
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            选择充值金额:
          </Typography>
          <Grid container spacing={1} sx={{ mb: 2 }}>
            {[100, 500, 1000, 2000].map((amount) => (
              <Grid item xs={6} key={amount}>
                <Button
                  variant={rechargeAmount === amount.toString() ? "contained" : "outlined"}
                  fullWidth
                  onClick={() => setRechargeAmount(amount.toString())}
                  sx={{ py: 1 }}
                >
                  {amount} 金币
                </Button>
              </Grid>
            ))}
          </Grid>
        </Box>

        <TextField
          fullWidth
          label="自定义充值金额"
          value={rechargeAmount}
          onChange={(e) => setRechargeAmount(e.target.value)}
          type="number"
          inputProps={{ min: 1}}
          variant="outlined"
          disabled={rechargeLoading}
        />
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={handleClose}
          disabled={rechargeLoading}
        >
          取消
        </Button>
        <Button 
          onClick={handleRecharge} 
          color="primary" 
          variant="contained"
          disabled={rechargeLoading || !rechargeAmount || parseInt(rechargeAmount) <= 0}
          startIcon={rechargeLoading ? <CircularProgress size={16} /> : <MonetizationOn />}
        >
          {rechargeLoading ? '充值中...' : `充值 ${rechargeAmount || 0} 金币`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RechargeDialog;