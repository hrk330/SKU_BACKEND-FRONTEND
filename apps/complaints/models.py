from django.db import models
from django.core.validators import MinLengthValidator, MinValueValidator
from django.utils import timezone
from decimal import Decimal
from apps.accounts.models import User
from apps.districts.models import District
from apps.catalog.models import SKU
from apps.retailers.models import Retailer


class Complaint(models.Model):
    """
    Enhanced complaint model for price violation and general complaint management.
    """
    
    COMPLAINT_TYPE_CHOICES = [
        ('price_violation', 'Price Violation'),
        ('service_issue', 'Service Issue'),
        ('product_quality', 'Product Quality'),
        ('other', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('under_review', 'Under Review'),
        ('investigation', 'Under Investigation'),
        ('waiting_response', 'Waiting for Response'),
        ('resolved', 'Resolved'),
        ('rejected', 'Rejected'),
        ('closed', 'Closed'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    # Basic complaint information
    complaint_type = models.CharField(
        max_length=20,
        choices=COMPLAINT_TYPE_CHOICES,
        default='price_violation',
        help_text="Type of complaint"
    )
    title = models.CharField(
        max_length=200,
        validators=[MinLengthValidator(5)],
        help_text="Complaint title"
    )
    description = models.TextField(
        validators=[MinLengthValidator(10)],
        help_text="Detailed complaint description"
    )
    complainant = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='complaints',
        help_text="User who filed the complaint"
    )
    district = models.ForeignKey(
        District,
        on_delete=models.CASCADE,
        related_name='complaints',
        help_text="District where complaint occurred"
    )
    
    # Product and retailer information
    sku = models.ForeignKey(
        SKU,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='complaints',
        help_text="Related SKU (if applicable)"
    )
    reported_retailer = models.ForeignKey(
        Retailer,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='complaints_against',
        help_text="Retailer against whom complaint is filed"
    )
    
    # Price violation specific fields
    reported_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Price charged by retailer"
    )
    reference_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Government reference price at time of complaint"
    )
    price_difference = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Difference between reported and reference price"
    )
    price_difference_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Percentage difference in price"
    )
    
    # Location and incident details
    incident_location = models.TextField(
        blank=True,
        help_text="Specific location where incident occurred"
    )
    incident_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Date and time when incident occurred"
    )
    witness_details = models.TextField(
        blank=True,
        help_text="Details of any witnesses"
    )
    contact_number = models.CharField(
        max_length=17,
        blank=True,
        help_text="Contact number for follow-up"
    )
    
    # Status and assignment
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        help_text="Complaint status"
    )
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='medium',
        help_text="Complaint priority"
    )
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_complaints',
        help_text="User assigned to handle the complaint"
    )
    
    # Investigation and resolution
    investigation_notes = models.TextField(
        blank=True,
        help_text="Notes from investigation"
    )
    resolution_action = models.TextField(
        blank=True,
        help_text="Action taken to resolve the complaint"
    )
    resolution_report = models.TextField(
        blank=True,
        help_text="Final resolution report sent to complainant"
    )
    resolution_notes = models.TextField(
        blank=True,
        help_text="Internal resolution notes"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'complaints_complaint'
        verbose_name = 'Complaint'
        verbose_name_plural = 'Complaints'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.complainant.get_full_name()}"
    
    def save(self, *args, **kwargs):
        """Override save to calculate price differences."""
        if self.reported_price and self.reference_price:
            self.price_difference = self.reported_price - self.reference_price
            if self.reference_price > 0:
                self.price_difference_percentage = (
                    (self.price_difference / self.reference_price) * 100
                )
        super().save(*args, **kwargs)
    
    @property
    def is_resolved(self):
        """Check if complaint is resolved."""
        return self.status == 'resolved'
    
    @property
    def is_pending(self):
        """Check if complaint is pending."""
        return self.status == 'pending'
    
    @property
    def is_price_violation(self):
        """Check if this is a price violation complaint."""
        return self.complaint_type == 'price_violation'
    
    @property
    def has_evidence(self):
        """Check if complaint has evidence files."""
        return self.evidence_files.exists()


class ComplaintEvidence(models.Model):
    """
    Model for storing evidence files related to complaints.
    """
    
    FILE_TYPE_CHOICES = [
        ('image', 'Image'),
        ('document', 'Document'),
        ('receipt', 'Receipt'),
        ('invoice', 'Invoice'),
        ('other', 'Other'),
    ]
    
    complaint = models.ForeignKey(
        Complaint,
        on_delete=models.CASCADE,
        related_name='evidence_files',
        help_text="Related complaint"
    )
    file = models.FileField(
        upload_to='complaints/evidence/%Y/%m/%d/',
        help_text="Evidence file"
    )
    file_type = models.CharField(
        max_length=20,
        choices=FILE_TYPE_CHOICES,
        help_text="Type of evidence file"
    )
    description = models.TextField(
        blank=True,
        help_text="Description of the evidence"
    )
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='uploaded_evidence',
        help_text="User who uploaded the evidence"
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'complaints_evidence'
        verbose_name = 'Complaint Evidence'
        verbose_name_plural = 'Complaint Evidence'
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.complaint.title} - {self.get_file_type_display()}"


class ComplaintStatusHistory(models.Model):
    """
    Model for tracking complaint status changes and history.
    """
    
    complaint = models.ForeignKey(
        Complaint,
        on_delete=models.CASCADE,
        related_name='status_history',
        help_text="Related complaint"
    )
    old_status = models.CharField(
        max_length=20,
        choices=Complaint.STATUS_CHOICES,
        null=True,
        blank=True,
        help_text="Previous status"
    )
    new_status = models.CharField(
        max_length=20,
        choices=Complaint.STATUS_CHOICES,
        help_text="New status"
    )
    changed_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='status_changes',
        help_text="User who changed the status"
    )
    notes = models.TextField(
        blank=True,
        help_text="Notes about the status change"
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'complaints_status_history'
        verbose_name = 'Complaint Status History'
        verbose_name_plural = 'Complaint Status Histories'
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.complaint.title} - {self.old_status} → {self.new_status}"


class ComplaintNotification(models.Model):
    """
    Model for tracking notifications sent to users about complaint updates.
    """
    
    NOTIFICATION_TYPE_CHOICES = [
        ('status_change', 'Status Change'),
        ('assignment', 'Assignment'),
        ('resolution', 'Resolution'),
        ('evidence_request', 'Evidence Request'),
        ('follow_up', 'Follow Up'),
    ]
    
    complaint = models.ForeignKey(
        Complaint,
        on_delete=models.CASCADE,
        related_name='notifications',
        help_text="Related complaint"
    )
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='complaint_notifications',
        help_text="User who receives the notification"
    )
    notification_type = models.CharField(
        max_length=20,
        choices=NOTIFICATION_TYPE_CHOICES,
        help_text="Type of notification"
    )
    title = models.CharField(
        max_length=200,
        help_text="Notification title"
    )
    message = models.TextField(
        help_text="Notification message"
    )
    sent_via_email = models.BooleanField(
        default=False,
        help_text="Whether notification was sent via email"
    )
    sent_via_sms = models.BooleanField(
        default=False,
        help_text="Whether notification was sent via SMS"
    )
    sent_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'complaints_notification'
        verbose_name = 'Complaint Notification'
        verbose_name_plural = 'Complaint Notifications'
        ordering = ['-sent_at']
    
    def __str__(self):
        return f"{self.recipient.get_full_name()} - {self.title}"
